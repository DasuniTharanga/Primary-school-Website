import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import {
  openDatabase,
  seedDatabase,
  kinds,
  contentRecord,
  settingsRecord,
  publicUser,
  audit,
  transaction,
} from './db.mjs';
import {
  assert,
  HttpError,
  authenticate,
  requireAuth,
  requireAdmin,
  checkMutation,
  rateLimit,
  hashToken,
  createSession,
  cookie,
  hashPassword,
  verifyPassword,
  createUser,
} from './security.mjs';
import * as v from './validation.mjs';
import { saveUpload, isPublishedMedia } from './media.mjs';

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}
function readJson(req, max = 64000) {
  assert(
    (req.headers['content-type'] || '').split(';')[0] === 'application/json',
    415,
    'Send application/json.',
  );
  if (Number(req.headers['content-length']) > max) {
    req.resume();
    throw new HttpError(413, 'The request is too large.');
  }
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0,
      failed = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > max) {
        if (!failed) reject(new HttpError(413, 'The request is too large.'));
        failed = true;
        chunks.length = 0;
      } else if (!failed) chunks.push(chunk);
    });
    req.on('end', () => {
      if (failed) return;
      try {
        resolveBody(v.object(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
      } catch (error) {
        reject(error instanceof HttpError ? error : new HttpError(400, 'Invalid JSON.'));
      }
    });
    req.on('error', () => reject(new HttpError(400, 'The request could not be read.')));
  });
}
function securityHeaders(res, cfg) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  if (cfg.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}
function pageResult(items, total, page, limit) {
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
function fetchContent(db, kind, url, admin = false) {
  const q = v.pageQuery(url),
    conditions = ['kind=?'],
    params = [kind];
  if (!admin) conditions.push("status='published'");
  else if (q.status) {
    v.choice(q.status, 'status', ['draft', 'published']);
    conditions.push('status=?');
    params.push(q.status);
  }
  if (q.search) {
    conditions.push('(title LIKE ? OR summary LIKE ?)');
    params.push(`%${q.search}%`, `%${q.search}%`);
  }
  if (q.category) {
    conditions.push('category=?');
    params.push(q.category);
  }
  const period = url.searchParams.get('period');
  if (kind === 'events' && period && period !== 'all') {
    v.choice(period, 'event period', ['upcoming', 'past']);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    conditions.push(`json_extract(data_json,'$.date') ${period === 'past' ? '<' : '>='} ?`);
    params.push(today);
  }
  const where = conditions.join(' AND ');
  const total = db.prepare(`SELECT count(*) AS n FROM content WHERE ${where}`).get(...params).n;
  // Sort classes and staff explicitly; other lists show pinned/recent items first.
  const ordering = ['classes', 'teachers', 'gallery', 'resources'].includes(kind)
    ? 'sort_order, created_at DESC, id'
    : kind === 'events'
      ? `json_extract(data_json,'$.date') ${period === 'upcoming' ? 'ASC' : 'DESC'}, id`
      : "coalesce(json_extract(data_json,'$.pinned'),0) DESC,published_at DESC, id";
  const items = db
    .prepare(`SELECT * FROM content WHERE ${where} ORDER BY ${ordering} LIMIT ? OFFSET ?`)
    .all(...params, q.limit, (q.page - 1) * q.limit)
    .map(contentRecord);
  const categories = db
    .prepare(
      `SELECT DISTINCT category FROM content WHERE kind=? ${admin ? '' : "AND status='published'"} AND category!='' ORDER BY category`,
    )
    .all(kind)
    .map((r) => r.category);
  return { ...pageResult(items, total, q.page, q.limit), categories };
}
function inboxRecord(row, table) {
  const base = {
    id: row.id,
    reference: row.reference,
    status: row.status,
    internalNotes: row.internal_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
  return table === 'messages'
    ? {
        ...base,
        name: row.name,
        email: row.email,
        phone: row.phone,
        subject: row.subject,
        message: row.message,
      }
    : {
        ...base,
        parentName: row.parent_name,
        parentEmail: row.parent_email,
        phone: row.phone,
        childName: row.child_name,
        dateOfBirth: row.date_of_birth,
        grade: row.grade,
        address: row.address,
        message: row.message,
        consentAt: row.consent_at,
      };
}

export async function createApplication(cfg) {
  const db = openDatabase(cfg.dbPath);
  seedDatabase(db);
  const dummyHash = await hashPassword('dummy-account-for-timing-742819');
  const handler = async (req, res) => {
    securityHeaders(res, cfg);
    try {
      const url = new URL(req.url, cfg.origin),
        path = url.pathname,
        method = req.method;
      const ip = cfg.trustProxy
        ? (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress
        : req.socket.remoteAddress;
      let auth = authenticate(db, req, cfg);
      const recheck = () => {
        auth = authenticate(db, req, cfg);
        requireAuth(auth);
        if (path.startsWith('/api/admin/') && !/^\/api\/admin\/(?:content\/|media$)/.test(path))
          requireAdmin(auth);
        checkMutation(req, cfg, auth, true);
      };
      const readBody = async (max = 64000) => {
        const input = await readJson(req, max);
        if (path.startsWith('/api/admin/') || path === '/api/auth/password') recheck();
        return input;
      };
      if (path.startsWith('/api/')) rateLimit(db, `api:${hashToken(ip || 'unknown')}`, 400, 60000);
      if (path.startsWith('/api/admin/')) {
        requireAuth(auth);
        if (!['GET', 'HEAD'].includes(method)) checkMutation(req, cfg, auth, true);
      } else if (!['GET', 'HEAD'].includes(method) && path.startsWith('/api/')) {
        if (['/api/auth/password', '/api/auth/logout'].includes(path)) requireAuth(auth);
        checkMutation(req, cfg, auth, ['/api/auth/password', '/api/auth/logout'].includes(path));
      }
      if (method === 'GET' && path === '/api/health') return json(res, 200, { status: 'ok' });
      if (method === 'GET' && path === '/sitemap.xml') {
        const routes = [
          '/',
          '/about',
          '/classes',
          '/teachers',
          '/events',
          '/gallery',
          '/contact',
          '/admissions',
          '/notices',
          '/resources',
          '/privacy',
        ];
        for (const item of db
          .prepare(
            "SELECT id,kind FROM content WHERE status='published' AND kind IN ('notices','events')",
          )
          .all())
          routes.push(`/${item.kind}/${item.id}`);
        const xml =
          '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          routes.map((route) => `<url><loc>${cfg.origin}${route}</loc></url>`).join('') +
          '</urlset>';
        res.writeHead(200, {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        });
        return res.end(xml);
      }
      if (method === 'GET' && path === '/api/site') {
        const counts = db
          .prepare("SELECT kind,count(*) AS n FROM content WHERE status='published' GROUP BY kind")
          .all();
        return json(res, 200, {
          settings: settingsRecord(db),
          counts: Object.fromEntries(counts.map((r) => [r.kind, r.n])),
        });
      }
      if (method === 'GET' && path === '/api/auth/session')
        return json(res, 200, {
          user: auth?.user || null,
          csrfToken: auth?.session.csrf_token || '',
        });
      if (method === 'POST' && path === '/api/auth/login') {
        const input = await readBody(),
          email = v.email(input.email);
        assert(
          typeof input.password === 'string' &&
            input.password.length > 0 &&
            input.password.length <= 128,
          400,
          'Please enter your password.',
        );
        rateLimit(db, `login-ip:${hashToken(ip || 'unknown')}`, 30, 900000);
        rateLimit(db, `login-account:${hashToken(email)}`, 8, 900000);
        const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
        const valid = await verifyPassword(input.password, user?.password_hash || dummyHash);
        assert(user?.active && valid, 401, 'The email or password is incorrect.');
        // Recheck after the asynchronous password verification: account changes
        // and password rotations must not race a pending login.
        const current = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
        assert(
          current?.active && current.password_hash === user.password_hash,
          401,
          'The email or password is incorrect.',
        );
        const session = createSession(db, current, cfg);
        db.prepare('DELETE FROM rate_limits WHERE key=?').run(`login-account:${hashToken(email)}`);
        audit(db, current, 'Signed in');
        res.setHeader('Set-Cookie', cookie(cfg, session.raw, Math.floor(cfg.sessionMs / 1000)));
        return json(res, 200, { user: publicUser(current), csrfToken: session.csrf });
      }
      if (method === 'POST' && path === '/api/auth/logout') {
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(auth.session.token_hash);
        res.setHeader('Set-Cookie', cookie(cfg, '', 0));
        return json(res, 200, { ok: true });
      }
      if (method === 'POST' && path === '/api/auth/password') {
        rateLimit(db, `password:${auth.user.id}`, 8, 900000);
        const input = await readBody(),
          next = v.password(input.newPassword);
        assert(
          typeof input.currentPassword === 'string' && input.currentPassword.length <= 128,
          400,
          'Enter your current password.',
        );
        const user = db.prepare('SELECT * FROM users WHERE id=?').get(auth.user.id);
        assert(
          await verifyPassword(input.currentPassword, user.password_hash),
          400,
          'Your current password is incorrect.',
        );
        assert(input.currentPassword !== next, 400, 'Choose a different password.');
        const digest = await hashPassword(next);
        recheck();
        transaction(db, () => {
          const updated = db
            .prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=? AND password_hash=?')
            .run(digest, new Date().toISOString(), user.id, user.password_hash);
          assert(updated.changes === 1, 409, 'The account changed. Please sign in again.');
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
          audit(db, auth.user, 'Changed password');
        });
        res.setHeader('Set-Cookie', cookie(cfg, '', 0));
        return json(res, 200, { ok: true });
      }
      const publicMatch = path.match(/^\/api\/content\/([a-z]+)(?:\/([a-f0-9-]{36}))?$/);
      if (method === 'GET' && publicMatch) {
        const [, kind, id] = publicMatch;
        v.choice(kind, 'content type', kinds);
        if (!id) return json(res, 200, fetchContent(db, kind, url));
        const item = contentRecord(
          db
            .prepare("SELECT * FROM content WHERE kind=? AND id=? AND status='published'")
            .get(kind, id),
        );
        assert(item, 404, 'This item is not available.');
        return json(res, 200, { item });
      }
      if (method === 'POST' && path === '/api/contact') {
        rateLimit(db, `contact:${hashToken(ip || 'unknown')}`, 5, 600000);
        const input = await readBody();
        assert(!input.website, 400, 'This message could not be submitted.');
        assert(input.consent === true, 400, 'Please accept the privacy notice.');
        const name = v.text(input.name, 'Name', 2, 100),
          email = v.email(input.email),
          phone = v.phone(input.phone);
        const subject = v.text(input.subject, 'Subject', 2, 150),
          message = v.text(input.message, 'Message', 10, 4000);
        const now = new Date().toISOString(),
          id = randomUUID(),
          reference = `MSG-${randomBytes(6).toString('hex').toUpperCase()}`;
        db.prepare(
          `INSERT INTO messages(id,reference,name,email,phone,subject,message,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?)`,
        ).run(id, reference, name, email, phone, subject, message, now, now);
        return json(res, 201, {
          reference,
          message: 'Your message has reached the school office.',
        });
      }
      if (method === 'POST' && path === '/api/admissions') {
        rateLimit(db, `admission:${hashToken(ip || 'unknown')}`, 5, 600000);
        assert(
          settingsRecord(db).admissionsOpen,
          403,
          'Admissions enquiries are currently closed. Please contact the school.',
        );
        const input = await readBody();
        assert(!input.website, 400, 'This enquiry could not be submitted.');
        assert(input.consent === true, 400, 'Please accept the privacy notice.');
        const birth = v.date(input.dateOfBirth, 'Date of birth', true);
        const today = new Date().toISOString().slice(0, 10);
        assert(
          birth < today &&
            birth >= new Date(Date.now() - 20 * 366 * 86400000).toISOString().slice(0, 10),
          400,
          'Please check the child’s date of birth.',
        );
        const fields = [
          v.text(input.parentName, 'Parent / guardian name', 2, 100),
          v.email(input.parentEmail),
          v.phone(input.phone, true),
          v.text(input.childName, 'Child name', 2, 100),
          birth,
          v.number(input.grade, 'Grade', 1, 5),
          v.text(input.address, 'Address', 5, 600),
          v.text(input.message || '', 'Message', 0, 3000),
        ];
        const now = new Date().toISOString(),
          id = randomUUID(),
          reference = `ADM-${randomBytes(6).toString('hex').toUpperCase()}`;
        db.prepare(
          `INSERT INTO admissions(id,reference,parent_name,parent_email,phone,child_name,date_of_birth,grade,address,message,consent_at,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).run(id, reference, ...fields, now, now, now);
        return json(res, 201, {
          reference,
          message:
            'Your enquiry has reached the school office. This is not an admission confirmation.',
        });
      }
      if (method === 'GET' && path === '/api/admin/dashboard') {
        const contentCounts = Object.fromEntries(
          kinds.map((kind) => [
            kind,
            db
              .prepare(
                "SELECT count(*) AS total,sum(status='published') AS published FROM content WHERE kind=?",
              )
              .get(kind),
          ]),
        );
        const recent = db
          .prepare('SELECT * FROM content ORDER BY updated_at DESC LIMIT 5')
          .all()
          .map(contentRecord);
        const inbox =
          auth.user.role === 'ADMIN'
            ? {
                messages: db.prepare("SELECT count(*) AS n FROM messages WHERE status='NEW'").get()
                  .n,
                admissions: db
                  .prepare("SELECT count(*) AS n FROM admissions WHERE status='NEW'")
                  .get().n,
              }
            : null;
        return json(res, 200, { contentCounts, recent, inbox });
      }
      const contentMatch = path.match(/^\/api\/admin\/content\/([a-z]+)(?:\/([a-f0-9-]{36}))?$/);
      if (contentMatch) {
        const [, kind, id] = contentMatch;
        v.choice(kind, 'content type', kinds);
        if (method === 'GET') {
          if (!id) return json(res, 200, fetchContent(db, kind, url, true));
          const item = contentRecord(
            db.prepare('SELECT * FROM content WHERE id=? AND kind=?').get(id, kind),
          );
          assert(item, 404, 'This item was not found.');
          return json(res, 200, { item });
        }
        if (method === 'POST' && !id) {
          const input = v.validateContent(db, kind, await readBody()),
            now = new Date().toISOString(),
            createdId = randomUUID();
          transaction(db, () => {
            db.prepare(
              `INSERT INTO content(id,kind,title,summary,body,category,status,image_path,data_json,sort_order,published_at,created_by,created_at,updated_at)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            ).run(
              createdId,
              kind,
              input.title,
              input.summary,
              input.body,
              input.category,
              input.status,
              input.imagePath,
              JSON.stringify(input.data),
              input.sortOrder,
              input.status === 'published' ? now : null,
              auth.user.id,
              now,
              now,
            );
            audit(db, auth.user, 'Created ' + kind, createdId);
          });
          return json(res, 201, {
            item: contentRecord(db.prepare('SELECT * FROM content WHERE id=?').get(createdId)),
          });
        }
        if (method === 'PATCH' && id) {
          const input = await readBody(),
            item = v.validateContent(db, kind, input),
            version = v.number(input.version, 'Version', 1, 1000000);
          const current = db.prepare('SELECT * FROM content WHERE id=? AND kind=?').get(id, kind);
          assert(current, 404, 'This item was not found.');
          const now = new Date().toISOString();
          transaction(db, () => {
            const result = db
              .prepare(
                `UPDATE content SET title=?,summary=?,body=?,category=?,status=?,image_path=?,data_json=?,sort_order=?,published_at=?,updated_at=?,version=version+1
              WHERE id=? AND kind=? AND version=?`,
              )
              .run(
                item.title,
                item.summary,
                item.body,
                item.category,
                item.status,
                item.imagePath,
                JSON.stringify(item.data),
                item.sortOrder,
                item.status === 'published' ? current.published_at || now : null,
                now,
                id,
                kind,
                version,
              );
            assert(
              result.changes === 1,
              409,
              'Someone else updated this item. Reload it before saving.',
            );
            audit(db, auth.user, 'Updated ' + kind, id);
          });
          return json(res, 200, {
            item: contentRecord(db.prepare('SELECT * FROM content WHERE id=?').get(id)),
          });
        }
        if (method === 'DELETE' && id) {
          const input = await readBody(),
            version = v.number(input.version, 'Version', 1, 1000000);
          transaction(db, () => {
            assert(
              db.prepare('SELECT id FROM content WHERE id=? AND kind=?').get(id, kind),
              404,
              'This item was not found.',
            );
            const result = db
              .prepare('DELETE FROM content WHERE id=? AND kind=? AND version=?')
              .run(id, kind, version);
            assert(result.changes === 1, 409, 'This item changed. Reload before deleting.');
            audit(db, auth.user, 'Deleted ' + kind, id);
          });
          return json(res, 200, { ok: true });
        }
      }
      if (method === 'POST' && path === '/api/admin/media') {
        rateLimit(db, `upload:${auth.user.id}`, 30, 600000);
        return json(
          res,
          201,
          await saveUpload(db, cfg, auth.user, await readBody(8000000), recheck),
        );
      }
      if (path === '/api/admin/settings') {
        requireAdmin(auth);
        if (method === 'GET') return json(res, 200, { settings: settingsRecord(db) });
        if (method === 'PATCH') {
          const input = await readBody(),
            settings = v.validateSettings(db, input),
            version = v.number(input.version, 'Version', 1, 1000000);
          transaction(db, () => {
            const result = db
              .prepare(
                'UPDATE settings SET data_json=?,updated_at=?,version=version+1 WHERE id=1 AND version=?',
              )
              .run(JSON.stringify(settings), new Date().toISOString(), version);
            assert(result.changes === 1, 409, 'School settings changed. Reload before saving.');
            audit(db, auth.user, 'Updated school settings');
          });
          return json(res, 200, { settings: settingsRecord(db) });
        }
      }
      const inboxMatch = path.match(/^\/api\/admin\/(messages|admissions)(?:\/([a-f0-9-]{36}))?$/);
      if (inboxMatch) {
        requireAdmin(auth);
        const [, table, id] = inboxMatch;
        if (method === 'GET') {
          if (id) {
            const item = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
            assert(item, 404, 'This enquiry was not found.');
            return json(res, 200, { item: inboxRecord(item, table) });
          }
          const q = v.pageQuery(url),
            conditions = [],
            params = [];
          if (q.status) {
            v.choice(
              q.status,
              'status',
              table === 'messages' ? ['NEW', 'READ', 'RESOLVED'] : ['NEW', 'CONTACTED', 'CLOSED'],
            );
            conditions.push('status=?');
            params.push(q.status);
          }
          if (q.search) {
            conditions.push(
              table === 'messages'
                ? '(name LIKE ? OR email LIKE ? OR reference LIKE ?)'
                : '(parent_name LIKE ? OR child_name LIKE ? OR reference LIKE ?)',
            );
            params.push(...Array(3).fill(`%${q.search}%`));
          }
          const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
          const total = db.prepare(`SELECT count(*) AS n FROM ${table} ${where}`).get(...params).n;
          const items = db
            .prepare(`SELECT * FROM ${table} ${where} ORDER BY created_at DESC,id LIMIT ? OFFSET ?`)
            .all(...params, q.limit, (q.page - 1) * q.limit)
            .map((r) => inboxRecord(r, table));
          return json(res, 200, pageResult(items, total, q.page, q.limit));
        }
        if (method === 'PATCH' && id) {
          const input = await readBody(),
            status = v.choice(
              input.status,
              'status',
              table === 'messages' ? ['NEW', 'READ', 'RESOLVED'] : ['NEW', 'CONTACTED', 'CLOSED'],
            ),
            notes = v.text(input.internalNotes || '', 'Internal notes', 0, 4000),
            version = v.number(input.version, 'Version', 1, 1000000);
          assert(
            db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id),
            404,
            'This enquiry was not found.',
          );
          transaction(db, () => {
            const result = db
              .prepare(
                `UPDATE ${table} SET status=?,internal_notes=?,updated_at=?,version=version+1 WHERE id=? AND version=?`,
              )
              .run(status, notes, new Date().toISOString(), id, version);
            assert(result.changes === 1, 409, 'This enquiry changed. Reload before saving.');
            audit(db, auth.user, 'Updated ' + table + ' status', id);
          });
          return json(res, 200, {
            item: inboxRecord(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id), table),
          });
        }
        if (method === 'DELETE' && id) {
          const input = await readBody(),
            version = v.number(input.version, 'Version', 1, 1000000);
          transaction(db, () => {
            assert(
              db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id),
              404,
              'This enquiry was not found.',
            );
            assert(
              db.prepare(`DELETE FROM ${table} WHERE id=? AND version=?`).run(id, version)
                .changes === 1,
              409,
              'This enquiry changed. Reload before deleting.',
            );
            audit(db, auth.user, 'Deleted ' + table, id);
          });
          return json(res, 200, { ok: true });
        }
      }
      const userMatch = path.match(/^\/api\/admin\/users(?:\/([a-f0-9-]{36}))?$/);
      if (userMatch) {
        requireAdmin(auth);
        const id = userMatch[1];
        if (method === 'GET' && !id)
          return json(res, 200, {
            items: db.prepare('SELECT * FROM users ORDER BY name').all().map(publicUser),
          });
        if (method === 'POST' && !id) {
          const input = await readBody(),
            email = v.email(input.email),
            name = v.text(input.name, 'Name', 2, 100),
            password = v.password(input.password),
            role = v.choice(input.role, 'role', ['ADMIN', 'EDITOR']);
          assert(
            !db.prepare('SELECT id FROM users WHERE email=?').get(email),
            409,
            'An account with this email already exists.',
          );
          let user;
          try {
            user = await createUser(db, { name, email, password, role }, recheck);
          } catch (error) {
            if (error.code?.includes('CONSTRAINT'))
              throw new HttpError(409, 'An account with this email already exists.');
            throw error;
          }
          audit(db, auth.user, 'Created staff account', user.id);
          return json(res, 201, { user });
        }
        if (method === 'PATCH' && id) {
          const input = await readBody(),
            name = v.text(input.name, 'Name', 2, 100),
            role = v.choice(input.role, 'role', ['ADMIN', 'EDITOR']);
          assert(typeof input.active === 'boolean', 400, 'Invalid account status.');
          const current = db.prepare('SELECT * FROM users WHERE id=?').get(id);
          assert(current, 404, 'This account was not found.');
          assert(
            id !== auth.user.id || (input.active && role === 'ADMIN'),
            400,
            'You cannot disable or demote your own administrator account.',
          );
          transaction(db, () => {
            if (current.role === 'ADMIN' && current.active && (!input.active || role !== 'ADMIN'))
              assert(
                db.prepare("SELECT count(*) AS n FROM users WHERE active=1 AND role='ADMIN'").get()
                  .n > 1,
                400,
                'Keep at least one active administrator.',
              );
            db.prepare('UPDATE users SET name=?,role=?,active=?,updated_at=? WHERE id=?').run(
              name,
              role,
              input.active ? 1 : 0,
              new Date().toISOString(),
              id,
            );
            if (!input.active || current.role !== role)
              db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
            audit(db, auth.user, 'Updated staff account', id);
          });
          return json(res, 200, {
            user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id)),
          });
        }
      }
      if (method === 'GET' && path === '/api/admin/audit') {
        requireAdmin(auth);
        const q = v.pageQuery(url),
          total = db.prepare('SELECT count(*) AS n FROM audit_log').get().n;
        const items = db
          .prepare(
            'SELECT id,actor,action,subject,created_at AS createdAt FROM audit_log ORDER BY created_at DESC,id LIMIT ? OFFSET ?',
          )
          .all(q.limit, (q.page - 1) * q.limit);
        return json(res, 200, pageResult(items, total, q.page, q.limit));
      }
      if (path.startsWith('/api/')) throw new HttpError(404, 'This API endpoint was not found.');
      assert(['GET', 'HEAD'].includes(method), 405, 'Method not allowed.');
      if (path.startsWith('/media/')) {
        const media = db.prepare('SELECT * FROM media WHERE public_path=?').get(path);
        assert(media && (auth || isPublishedMedia(db, path)), 404, 'This file is not available.');
        const disk = join(cfg.uploadPath, media.storage_name);
        assert(existsSync(disk), 404, 'This file is not available.');
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Content-Type', media.mime_type);
        if (media.mime_type === 'application/pdf') {
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="school-resource.pdf"; filename*=UTF-8''${encodeURIComponent(media.original_name)}`,
          );
          res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
        }
        const bytes = readFileSync(disk);
        res.setHeader('Content-Length', bytes.length);
        res.writeHead(200);
        return res.end(method === 'HEAD' ? undefined : bytes);
      }
      let decoded;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        throw new HttpError(400, 'Invalid URL.');
      }
      assert(
        !decoded.includes('\0') && !decoded.split('/').some((p) => p.startsWith('.')),
        404,
        'Page not found.',
      );
      const candidate = resolve(cfg.distPath, '.' + decoded);
      assert(
        candidate.startsWith(cfg.distPath + sep) || candidate === cfg.distPath,
        404,
        'Page not found.',
      );
      const staticFile =
        existsSync(candidate) && statSync(candidate).isFile()
          ? candidate
          : extname(path)
            ? null
            : join(cfg.distPath, 'index.html');
      assert(
        staticFile && existsSync(staticFile),
        404,
        'Page not found. Run npm run build before starting the production server.',
      );
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
        '.txt': 'text/plain; charset=utf-8',
      };
      res.setHeader('Content-Type', types[extname(staticFile)] || 'application/octet-stream');
      res.setHeader(
        'Cache-Control',
        path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
      const bytes = readFileSync(staticFile);
      res.setHeader('Content-Length', bytes.length);
      res.writeHead(200);
      res.end(method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      if (res.headersSent) {
        res.end();
        return;
      }
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 429) res.setHeader('Retry-After', '900');
      if (status === 500) console.error('Request failed:', error.message);
      json(res, status, {
        error:
          status === 500
            ? 'The server could not complete this request. Please try again.'
            : error.message,
      });
    }
  };
  const server = createServer(handler);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 60;
  return {
    server,
    db,
    close: async () => {
      await new Promise((resolveClose) => server.close(resolveClose));
      db.close();
    },
  };
}
