import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApplication } from '../server/app.mjs';
import { config } from '../server/config.mjs';
import {
  createUser,
  hashPassword,
  verifyPassword,
  hashToken,
  cookie,
} from '../server/security.mjs';

test('real HTTP authentication, authorization, persistence and school workflows', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'meegahathanna-test-'));
  const cfg = config({
    production: false,
    origin: 'http://localhost:5173',
    dbPath: join(directory, 'test.db'),
    uploadPath: join(directory, 'uploads'),
    idleMs: 60000,
    sessionMs: 3600000,
  });
  let app = await createApplication(cfg);
  let base;
  async function listen() {
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
  }
  await listen();
  t.after(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });
  const adminUser = await createUser(app.db, {
    name: 'Test Administrator',
    email: 'admin@example.test',
    password: 'TestAdminPassword2026',
    role: 'ADMIN',
  });
  const editorUser = await createUser(app.db, {
    name: 'Test Editor',
    email: 'editor@example.test',
    password: 'TestEditorPassword2026',
    role: 'EDITOR',
  });
  let admin, editor, uploadPath, notice, contact, admission;
  async function request(
    path,
    {
      method = 'GET',
      body,
      auth,
      origin = cfg.origin,
      requestHeader = true,
      csrf = true,
      headers = {},
      rawBody,
    } = {},
  ) {
    const mutation = method !== 'GET';
    const h = {
      ...(mutation
        ? {
            'Content-Type': 'application/json',
            Origin: origin,
            ...(requestHeader ? { 'X-School-Request': '1' } : {}),
          }
        : {}),
      ...(auth
        ? { Cookie: auth.cookie, ...(mutation && csrf ? { 'X-CSRF-Token': auth.csrf } : {}) }
        : {}),
      ...headers,
    };
    const res = await fetch(base + path, {
      method,
      headers: h,
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const data = (res.headers.get('content-type') || '').includes('application/json')
      ? await res.json()
      : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  }
  async function login(email, password) {
    const r = await request('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(r.status, 200);
    return {
      cookie: r.headers.get('set-cookie').split(';')[0],
      csrf: r.data.csrfToken,
      user: r.data.user,
    };
  }
  const sample = {
    title: 'A new school notice',
    summary: 'A useful update for our families.',
    body: 'School notice details.',
    category: 'School news',
    status: 'draft',
    imagePath: '',
    data: { pinned: false },
    sortOrder: 0,
  };

  await t.test(
    'seed is truthful: five classes, 29 private staff drafts and no invented events',
    async () => {
      const site = await request('/api/site');
      assert.equal(site.status, 200);
      assert.equal(site.data.settings.name, 'WP/MT/MEEGAHATHANNA PRIMARY COLLEGE');
      assert.equal(site.data.settings.phone, '');
      assert.equal(site.data.settings.email, '');
      assert.equal((await request('/api/content/classes')).data.total, 5);
      assert.equal((await request('/api/content/teachers')).data.total, 0);
      assert.equal((await request('/api/content/events')).data.total, 0);
      assert.equal(
        app.db
          .prepare("SELECT count(*) AS n FROM content WHERE kind='teachers' AND status='draft'")
          .get().n,
        29,
      );
    },
  );
  await t.test('password hashing uses random salts and rejects incorrect passwords', async () => {
    const a = await hashPassword('TestPassword2026'),
      b = await hashPassword('TestPassword2026');
    assert.notEqual(a, b);
    assert.equal(await verifyPassword('TestPassword2026', a), true);
    assert.equal(await verifyPassword('WrongPassword2026', a), false);
    assert.notEqual(
      app.db.prepare('SELECT password_hash FROM users WHERE id=?').get(adminUser.id).password_hash,
      'TestAdminPassword2026',
    );
  });
  await t.test('wrong passwords and missing accounts return the same error', async () => {
    const a = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@example.test', password: 'WrongPassword2026' },
    });
    const b = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'missing@example.test', password: 'WrongPassword2026' },
    });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.deepEqual(a.data, b.data);
  });
  await t.test(
    'login creates an HttpOnly cookie and stores only a hashed session token',
    async () => {
      admin = await login('ADMIN@EXAMPLE.TEST', 'TestAdminPassword2026');
      editor = await login('editor@example.test', 'TestEditorPassword2026');
      assert.equal(admin.user.role, 'ADMIN');
      assert.ok(!('password_hash' in admin.user));
      const raw = admin.cookie.split('=')[1];
      assert.ok(
        app.db.prepare('SELECT token_hash FROM sessions WHERE token_hash=?').get(hashToken(raw)),
      );
      assert.equal(
        app.db.prepare('SELECT token_hash FROM sessions WHERE token_hash=?').get(raw),
        undefined,
      );
      assert.match(cookie(cfg, raw, 3600), /HttpOnly; SameSite=Strict/);
      assert.match(cookie({ ...cfg, production: true }, raw, 3600), /^__Host-school_session=/);
      assert.match(cookie({ ...cfg, production: true }, raw, 3600), /; Secure$/);
    },
  );
  await t.test('all staff sections reject anonymous and forged sessions', async () => {
    const paths = [
      'dashboard',
      'content/notices',
      'content/events',
      'content/teachers',
      'content/classes',
      'content/gallery',
      'content/resources',
      'messages',
      'admissions',
      'settings',
      'users',
      'audit',
    ];
    for (const path of paths) {
      assert.equal((await request('/api/admin/' + path)).status, 401);
      assert.equal(
        (
          await request('/api/admin/' + path, {
            auth: { cookie: 'school_session=' + 'a'.repeat(43), csrf: 'fake' },
          })
        ).status,
        401,
      );
    }
    const before = app.db.prepare('SELECT count(*) AS n FROM content').get().n;
    assert.equal(
      (await request('/api/admin/content/notices', { method: 'POST', body: sample })).status,
      401,
    );
    assert.equal(app.db.prepare('SELECT count(*) AS n FROM content').get().n, before);
  });
  await t.test(
    'editors cannot read private enquiries or manage settings, accounts and logs',
    async () => {
      for (const path of ['messages', 'admissions', 'settings', 'users', 'audit'])
        assert.equal((await request('/api/admin/' + path, { auth: editor })).status, 403);
      assert.equal((await request('/api/admin/dashboard', { auth: editor })).data.inbox, null);
      const settings = (await request('/api/admin/settings', { auth: admin })).data.settings;
      assert.equal(
        (
          await request('/api/admin/settings', {
            method: 'PATCH',
            auth: editor,
            body: { ...settings, phone: '0111234567' },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request('/api/admin/users', {
            method: 'POST',
            auth: editor,
            body: {
              name: 'Injected admin',
              email: 'injected@example.test',
              password: 'NewAccountPass2026',
              role: 'ADMIN',
            },
          })
        ).status,
        403,
      );
      assert.equal(
        app.db.prepare('SELECT id FROM users WHERE email=?').get('injected@example.test'),
        undefined,
      );
      assert.equal((await request('/api/site')).data.settings.phone, '');
    },
  );
  await t.test(
    'cross-origin requests, missing custom headers and wrong CSRF tokens never mutate data',
    async () => {
      const before = app.db.prepare('SELECT count(*) AS n FROM content').get().n;
      for (const options of [
        { origin: 'https://attacker.example' },
        { requestHeader: false },
        { csrf: false },
        { headers: { 'X-CSRF-Token': 'wrong' } },
        { headers: { 'Sec-Fetch-Site': 'cross-site' } },
      ]) {
        assert.equal(
          (
            await request('/api/admin/content/notices', {
              method: 'POST',
              body: sample,
              auth: admin,
              ...options,
            })
          ).status,
          403,
        );
      }
      assert.equal(app.db.prepare('SELECT count(*) AS n FROM content').get().n, before);
      assert.equal(
        (
          await request('/api/contact', {
            method: 'POST',
            origin: 'https://attacker.example',
            body: {},
          })
        ).status,
        403,
      );
    },
  );
  await t.test('editors create real drafts which remain private until publication', async () => {
    const r = await request('/api/admin/content/notices', {
      method: 'POST',
      auth: editor,
      body: sample,
    });
    assert.equal(r.status, 201);
    notice = r.data.item;
    assert.equal((await request('/api/content/notices/' + notice.id)).status, 404);
    assert.ok(app.db.prepare('SELECT id FROM content WHERE id=?').get(notice.id));
    const result = await request('/api/admin/content/notices/' + notice.id, {
      method: 'PATCH',
      auth: editor,
      body: { ...notice, status: 'published' },
    });
    assert.equal(result.status, 200);
    notice = result.data.item;
    const publicItem = await request('/api/content/notices/' + notice.id);
    assert.equal(publicItem.data.item.body, sample.body);
  });
  await t.test(
    'stale versions cannot overwrite or delete another staff member’s changes',
    async () => {
      const updated = await request('/api/admin/content/notices/' + notice.id, {
        method: 'PATCH',
        auth: admin,
        body: { ...notice, title: 'Updated school notice' },
      });
      assert.equal(updated.status, 200);
      assert.equal(
        (
          await request('/api/admin/content/notices/' + notice.id, {
            method: 'PATCH',
            auth: editor,
            body: { ...notice, title: 'Stale overwrite' },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request('/api/admin/content/notices/' + notice.id, {
            method: 'DELETE',
            auth: editor,
            body: { version: notice.version },
          })
        ).status,
        409,
      );
      notice = updated.data.item;
      assert.equal(
        (await request('/api/content/notices/' + notice.id)).data.item.title,
        'Updated school notice',
      );
    },
  );
  await t.test(
    'invalid content types, dates, file references and dangerous links are rejected',
    async () => {
      assert.equal(
        (
          await request('/api/admin/content/notices', {
            method: 'POST',
            auth: admin,
            body: { ...sample, title: 'x' },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request('/api/admin/content/events', {
            method: 'POST',
            auth: admin,
            body: { ...sample, data: { date: '2026-02-30' } },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request('/api/admin/content/events', {
            method: 'POST',
            auth: admin,
            body: { ...sample, data: { date: '2026-12-12', time: '25:99' } },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request('/api/admin/content/resources', {
            method: 'POST',
            auth: admin,
            body: { ...sample, data: { link: 'javascript:alert(1)' } },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request('/api/admin/content/notices', {
            method: 'POST',
            auth: admin,
            body: { ...sample, imagePath: '/media/not-a-file.png' },
          })
        ).status,
        400,
      );
      assert.equal((await request('/api/content/unknown')).status, 400);
    },
  );
  await t.test('staff names must be checked before publishing imported profiles', async () => {
    const initial = (await request('/api/admin/content/teachers', { auth: admin })).data.items[0];
    assert.equal(
      (
        await request('/api/admin/content/teachers/' + initial.id, {
          method: 'PATCH',
          auth: admin,
          body: { ...initial, status: 'published' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/api/admin/content/teachers/' + initial.id, {
          method: 'PATCH',
          auth: admin,
          body: {
            ...initial,
            status: 'published',
            data: { ...initial.data, reviewRequired: false },
          },
        })
      ).status,
      200,
    );
    assert.equal((await request('/api/content/teachers')).data.total, 1);
  });
  await t.test(
    'image uploads require sign-in and reject SVG, fake images and oversized files',
    async () => {
      const bytes = await sharp({
        create: { width: 8, height: 8, channels: 3, background: '#701c36' },
      })
        .png()
        .toBuffer();
      const payload = { fileName: '../../school-photo.png', base64: bytes.toString('base64') };
      assert.equal(
        (await request('/api/admin/media', { method: 'POST', body: payload })).status,
        401,
      );
      assert.equal(
        (
          await request('/api/admin/media', {
            method: 'POST',
            auth: editor,
            body: {
              fileName: 'evil.svg',
              base64: Buffer.from('<svg onload="alert(1)"/>').toString('base64'),
            },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request('/api/admin/media', {
            method: 'POST',
            auth: editor,
            body: { fileName: 'fake.png', base64: Buffer.from('not an image').toString('base64') },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request('/api/admin/media', {
            method: 'POST',
            auth: editor,
            body: {
              fileName: 'oversized.png',
              base64: Buffer.concat([bytes, Buffer.alloc(4 * 1024 * 1024)]).toString('base64'),
            },
          })
        ).status,
        400,
      );
      const r = await request('/api/admin/media', { method: 'POST', auth: editor, body: payload });
      assert.equal(r.status, 201);
      uploadPath = r.data.path;
      assert.match(uploadPath, /^\/media\/[a-f0-9-]{36}\.webp$/);
      const metadata = await sharp((await request(uploadPath, { auth: editor })).data).metadata();
      assert.equal(metadata.format, 'webp');
      assert.equal(metadata.exif, undefined);
      assert.equal((await request(uploadPath)).status, 404);
    },
  );
  await t.test('gallery publishing requires consent and unpublishing hides the photo', async () => {
    const payload = {
      ...sample,
      title: 'A school photograph',
      kind: 'gallery',
      imagePath: uploadPath,
      status: 'published',
      data: { alt: 'A test photograph', consentConfirmed: false },
    };
    assert.equal(
      (await request('/api/admin/content/gallery', { method: 'POST', auth: editor, body: payload }))
        .status,
      400,
    );
    const r = await request('/api/admin/content/gallery', {
      method: 'POST',
      auth: editor,
      body: { ...payload, data: { ...payload.data, consentConfirmed: true } },
    });
    assert.equal(r.status, 201);
    assert.equal((await request(uploadPath)).status, 200);
    assert.equal(
      (
        await request('/api/admin/content/gallery/' + r.data.item.id, {
          method: 'PATCH',
          auth: editor,
          body: { ...r.data.item, status: 'draft' },
        })
      ).status,
      200,
    );
    assert.equal((await request(uploadPath)).status, 404);
  });
  await t.test('PDF resources are downloaded with attachment and sandbox headers', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
    const r = await request('/api/admin/media', {
      method: 'POST',
      auth: admin,
      body: { fileName: 'School guide.pdf', base64: pdf.toString('base64') },
    });
    assert.equal(r.status, 201);
    const created = await request('/api/admin/content/resources', {
      method: 'POST',
      auth: admin,
      body: { ...sample, status: 'published', data: { filePath: r.data.path } },
    });
    assert.equal(created.status, 201);
    const file = await request(r.data.path);
    assert.equal(file.status, 200);
    assert.match(file.headers.get('content-disposition'), /^attachment;/);
    assert.match(file.headers.get('content-security-policy'), /sandbox/);
  });
  await t.test('public contact forms save real messages and expose only a reference', async () => {
    const r = await request('/api/contact', {
      method: 'POST',
      body: {
        name: 'Test Guardian',
        email: 'guardian@example.test',
        phone: '0771234567',
        subject: 'School enquiry',
        message: 'Please tell me about visiting the school.',
        consent: true,
        website: '',
      },
    });
    assert.equal(r.status, 201);
    assert.match(r.data.reference, /^MSG-/);
    assert.ok(!('email' in r.data));
    const row = app.db.prepare('SELECT * FROM messages WHERE reference=?').get(r.data.reference);
    assert.equal(row.message, 'Please tell me about visiting the school.');
    contact = (await request('/api/admin/messages/' + row.id, { auth: admin })).data.item;
    assert.equal((await request('/api/admin/messages/' + row.id, { auth: editor })).status, 403);
    assert.equal((await request('/api/messages/' + row.id)).status, 404);
  });
  await t.test(
    'contact validation, honeypot, body limit and content type block invalid writes',
    async () => {
      const before = app.db.prepare('SELECT count(*) AS n FROM messages').get().n;
      const valid = {
        name: 'Test Guardian',
        email: 'guardian@example.test',
        phone: '',
        subject: 'Enquiry',
        message: 'A message with enough characters.',
        consent: true,
      };
      assert.equal(
        (await request('/api/contact', { method: 'POST', body: { ...valid, consent: false } }))
          .status,
        400,
      );
      assert.equal(
        (
          await request('/api/contact', {
            method: 'POST',
            body: { ...valid, website: 'spam.example' },
          })
        ).status,
        400,
      );
      assert.equal(
        (await request('/api/contact', { method: 'POST', body: { ...valid, email: 'invalid' } }))
          .status,
        400,
      );
      assert.equal(
        (
          await request('/api/contact', {
            method: 'POST',
            rawBody: '{',
            headers: { 'Content-Type': 'text/plain' },
          })
        ).status,
        415,
      );
      // Body size is checked before parsing or database writes.
      assert.equal(
        (await request('/api/admin/content/notices', { method: 'POST', auth: admin, rawBody: '{' }))
          .status,
        400,
      );
      assert.equal(
        (
          await request('/api/admin/content/notices', {
            method: 'POST',
            auth: admin,
            body: { ...sample, body: 'x'.repeat(70000) },
          })
        ).status,
        413,
      );
      assert.equal(app.db.prepare('SELECT count(*) AS n FROM messages').get().n, before);
    },
  );
  await t.test(
    'admissions save private child/guardian details and reject invalid dates',
    async () => {
      const valid = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.test',
        phone: '0771234567',
        childName: 'Test Child',
        dateOfBirth: '2020-05-20',
        grade: 1,
        address: 'Example address, Sri Lanka',
        message: 'We would like admissions information.',
        consent: true,
      };
      const r = await request('/api/admissions', { method: 'POST', body: valid });
      assert.equal(r.status, 201);
      assert.match(r.data.reference, /^ADM-/);
      assert.ok(!('childName' in r.data));
      const row = app.db
        .prepare('SELECT * FROM admissions WHERE reference=?')
        .get(r.data.reference);
      assert.equal(row.grade, 1);
      admission = (await request('/api/admin/admissions/' + row.id, { auth: admin })).data.item;
      assert.equal(
        (await request('/api/admin/admissions/' + row.id, { auth: editor })).status,
        403,
      );
      assert.equal(
        (
          await request('/api/admissions', {
            method: 'POST',
            body: { ...valid, dateOfBirth: '2999-01-01' },
          })
        ).status,
        400,
      );
      assert.equal(
        (await request('/api/admissions', { method: 'POST', body: { ...valid, grade: 6 } })).status,
        400,
      );
      assert.equal(
        (await request('/api/admissions', { method: 'POST', body: { ...valid, consent: false } }))
          .status,
        400,
      );
    },
  );
  await t.test(
    'settings updates persist, stale writes fail and admissions closure is enforced',
    async () => {
      const settings = (await request('/api/admin/settings', { auth: admin })).data.settings;
      const changed = await request('/api/admin/settings', {
        method: 'PATCH',
        auth: admin,
        body: { ...settings, phone: '0771234567', admissionsOpen: false },
      });
      assert.equal(changed.status, 200);
      assert.equal((await request('/api/site')).data.settings.phone, '0771234567');
      assert.equal(
        (
          await request('/api/admin/settings', {
            method: 'PATCH',
            auth: admin,
            body: { ...settings, phone: '0779999999' },
          })
        ).status,
        409,
      );
      const before = app.db.prepare('SELECT count(*) AS n FROM admissions').get().n;
      assert.equal((await request('/api/admissions', { method: 'POST', body: {} })).status, 403);
      assert.equal(app.db.prepare('SELECT count(*) AS n FROM admissions').get().n, before);
    },
  );
  await t.test('inbox follow-up updates are private and version protected', async () => {
    const r = await request('/api/admin/messages/' + contact.id, {
      method: 'PATCH',
      auth: admin,
      body: { status: 'READ', internalNotes: 'Contacted by phone.', version: contact.version },
    });
    assert.equal(r.status, 200);
    assert.equal(
      (
        await request('/api/admin/messages/' + contact.id, {
          method: 'PATCH',
          auth: admin,
          body: { status: 'RESOLVED', internalNotes: 'Stale note', version: contact.version },
        })
      ).status,
      409,
    );
    contact = r.data.item;
    assert.equal(
      (
        await request('/api/admin/admissions/' + admission.id, {
          method: 'PATCH',
          auth: admin,
          body: {
            status: 'CONTACTED',
            internalNotes: 'Waiting for official documents.',
            version: admission.version,
          },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request('/api/admin/messages/' + contact.id, {
          method: 'DELETE',
          auth: editor,
          body: { version: contact.version },
        })
      ).status,
      403,
    );
  });
  await t.test('staff creation validates passwords, duplicates and role injection', async () => {
    const payload = {
      name: 'New Staff',
      email: 'staff@example.test',
      password: 'SecureStaffPassword2026',
      role: 'EDITOR',
    };
    assert.equal(
      (
        await request('/api/admin/users', {
          method: 'POST',
          auth: admin,
          body: { ...payload, password: 'short' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/api/admin/users', {
          method: 'POST',
          auth: admin,
          body: { ...payload, role: 'SUPER_ADMIN' },
        })
      ).status,
      400,
    );
    const r = await request('/api/admin/users', { method: 'POST', auth: admin, body: payload });
    assert.equal(r.status, 201);
    assert.equal(r.data.user.role, 'EDITOR');
    assert.equal(
      (
        await request('/api/admin/users', {
          method: 'POST',
          auth: admin,
          body: { ...payload, email: 'STAFF@EXAMPLE.TEST' },
        })
      ).status,
      409,
    );
    const list = (await request('/api/admin/users', { auth: admin })).data.items;
    assert.ok(list.every((u) => !('password_hash' in u)));
  });
  await t.test('administrator cannot disable or demote their own account', async () => {
    assert.equal(
      (
        await request('/api/admin/users/' + adminUser.id, {
          method: 'PATCH',
          auth: admin,
          body: { name: adminUser.name, role: 'EDITOR', active: true },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/api/admin/users/' + adminUser.id, {
          method: 'PATCH',
          auth: admin,
          body: { name: adminUser.name, role: 'ADMIN', active: false },
        })
      ).status,
      400,
    );
    assert.equal(app.db.prepare('SELECT active FROM users WHERE id=?').get(adminUser.id).active, 1);
  });
  await t.test('account disabling revokes sessions immediately', async () => {
    assert.equal(
      (
        await request('/api/admin/users/' + editorUser.id, {
          method: 'PATCH',
          auth: admin,
          body: { name: editorUser.name, role: 'EDITOR', active: false },
        })
      ).status,
      200,
    );
    assert.equal((await request('/api/admin/content/notices', { auth: editor })).status, 401);
    assert.equal((await request('/api/auth/session', { auth: editor })).data.user, null);
    assert.equal(
      (
        await request('/api/auth/login', {
          method: 'POST',
          body: { email: editorUser.email, password: 'TestEditorPassword2026' },
        })
      ).status,
      401,
    );
  });
  await t.test('password changes revoke all sessions and require the old password', async () => {
    const staff = await login('staff@example.test', 'SecureStaffPassword2026');
    assert.equal(
      (
        await request('/api/auth/password', {
          method: 'POST',
          auth: staff,
          body: { currentPassword: 'WrongPassword2026', newPassword: 'ChangedPassword2026' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/api/auth/password', {
          method: 'POST',
          auth: staff,
          body: { currentPassword: 'SecureStaffPassword2026', newPassword: 'ChangedPassword2026' },
        })
      ).status,
      200,
    );
    assert.equal((await request('/api/admin/dashboard', { auth: staff })).status, 401);
    assert.equal(
      (
        await request('/api/auth/login', {
          method: 'POST',
          body: { email: 'staff@example.test', password: 'SecureStaffPassword2026' },
        })
      ).status,
      401,
    );
    assert.equal((await login('staff@example.test', 'ChangedPassword2026')).user.role, 'EDITOR');
  });
  await t.test('idle and absolute session expiry are enforced server-side', async () => {
    const staff = await login('staff@example.test', 'ChangedPassword2026'),
      digest = hashToken(staff.cookie.split('=')[1]);
    app.db
      .prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?')
      .run(Date.now() - cfg.idleMs - 1, digest);
    assert.equal((await request('/api/admin/dashboard', { auth: staff })).status, 401);
    const fresh = await login('staff@example.test', 'ChangedPassword2026');
    app.db
      .prepare('UPDATE sessions SET expires_at=0 WHERE token_hash=?')
      .run(hashToken(fresh.cookie.split('=')[1]));
    assert.equal((await request('/api/admin/dashboard', { auth: fresh })).status, 401);
  });
  await t.test('search, pagination and event periods work without SQL injection', async () => {
    assert.equal((await request('/api/content/classes?limit=2&page=2')).data.items.length, 2);
    assert.equal((await request('/api/content/classes?limit=0')).status, 400);
    assert.equal(
      (
        await request(
          '/api/content/notices?search=' + encodeURIComponent("' OR 1=1; DROP TABLE users; --"),
        )
      ).status,
      200,
    );
    assert.equal(app.db.prepare('SELECT count(*) AS n FROM users').get().n, 3);
    for (const date of ['2020-01-01', '2099-01-01'])
      assert.equal(
        (
          await request('/api/admin/content/events', {
            method: 'POST',
            auth: admin,
            body: {
              ...sample,
              title: 'School event ' + date,
              status: 'published',
              data: { date, time: '09:00', location: 'School' },
            },
          })
        ).status,
        201,
      );
    assert.equal((await request('/api/content/events?period=upcoming')).data.total, 1);
    assert.equal((await request('/api/content/events?period=past')).data.total, 1);
  });
  await t.test('records can be deleted by the administrator and are really removed', async () => {
    assert.equal(
      (
        await request('/api/admin/content/notices/' + notice.id, {
          method: 'DELETE',
          auth: admin,
          body: { version: notice.version },
        })
      ).status,
      200,
    );
    assert.equal((await request('/api/content/notices/' + notice.id)).status, 404);
    assert.equal(
      (
        await request('/api/admin/messages/' + contact.id, {
          method: 'DELETE',
          auth: admin,
          body: { version: contact.version },
        })
      ).status,
      200,
    );
    assert.equal(app.db.prepare('SELECT id FROM messages WHERE id=?').get(contact.id), undefined);
    const latest = (await request('/api/admin/admissions/' + admission.id, { auth: admin })).data
      .item;
    assert.equal(
      (
        await request('/api/admin/admissions/' + latest.id, {
          method: 'DELETE',
          auth: admin,
          body: { version: latest.version },
        })
      ).status,
      200,
    );
    assert.equal(
      app.db.prepare('SELECT id FROM admissions WHERE id=?').get(admission.id),
      undefined,
    );
    const log = (await request('/api/admin/audit', { auth: admin })).data;
    assert.ok(log.total > 10);
  });
  await t.test('restarting the application preserves database content and settings', async () => {
    await app.close();
    app = await createApplication(cfg);
    await listen();
    assert.equal((await request('/api/site')).data.settings.phone, '0771234567');
    assert.equal((await request('/api/content/classes')).data.total, 5);
    assert.equal((await request('/api/content/teachers')).data.total, 1);
    assert.equal(app.db.prepare('SELECT count(*) AS n FROM users').get().n, 3);
  });
  await t.test('security headers and private filesystem boundaries are applied', async () => {
    const health = await request('/api/health');
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-frame-options'), 'DENY');
    assert.match(health.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    for (const path of [
      '/.env',
      '/%2eenv',
      '/server/app.mjs',
      '/database/schema.sql',
      '/data/school.db',
      '/api/nonexistent',
    ])
      assert.equal((await request(path)).status, 404);
  });
  await t.test('logout invalidates the session rather than only hiding the dashboard', async () => {
    assert.equal(
      (await request('/api/auth/logout', { method: 'POST', auth: admin, body: {} })).status,
      200,
    );
    assert.equal((await request('/api/admin/dashboard', { auth: admin })).status, 401);
  });
  await t.test('repeated wrong logins are rate limited', async () => {
    app.db.prepare('DELETE FROM rate_limits').run();
    for (let i = 0; i < 8; i++)
      assert.equal(
        (
          await request('/api/auth/login', {
            method: 'POST',
            body: { email: 'limited@example.test', password: 'WrongPassword2026' },
          })
        ).status,
        401,
      );
    const blocked = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'limited@example.test', password: 'WrongPassword2026' },
    });
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));
  });
});
