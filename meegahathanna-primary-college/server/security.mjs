import {
  scrypt as rawScrypt,
  randomBytes,
  createHash,
  timingSafeEqual,
  randomUUID,
} from 'node:crypto';
import { promisify } from 'node:util';
import { publicUser } from './db.mjs';

const scrypt = promisify(rawScrypt);
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function assert(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}
export const hashToken = (value) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [, n, r, p, salt, expected] = stored.split('$');
  const key = await scrypt(password, salt, 64, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return equal(key.toString('hex'), expected);
}
export function cookieName(cfg) {
  return cfg.production ? '__Host-school_session' : 'school_session';
}
export function cookie(cfg, value, age) {
  return `${cookieName(cfg)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${cfg.production ? '; Secure' : ''}`;
}
export function readCookie(req, name) {
  const pairs = (req.headers.cookie || '').split(';').map((p) => p.trim());
  return pairs.find((p) => p.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}
export function authenticate(db, req, cfg) {
  const raw = readCookie(req, cookieName(cfg));
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  const session = db
    .prepare(
      `SELECT s.*,u.name,u.email,u.role,u.active,u.id FROM sessions s
    JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`,
    )
    .get(hashToken(raw));
  if (!session) return null;
  const now = Date.now();
  if (!session.active || session.expires_at <= now || now - session.last_seen > cfg.idleMs) {
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.token_hash);
    return null;
  }
  db.prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?').run(now, session.token_hash);
  return { user: publicUser(session), session };
}
export function requireAuth(auth) {
  assert(auth, 401, 'Please sign in to continue.');
}
export function requireAdmin(auth) {
  requireAuth(auth);
  assert(auth.user.role === 'ADMIN', 403, 'Administrator access is required.');
}
export function checkMutation(req, cfg, auth, csrfRequired = false) {
  assert(
    req.headers.origin === cfg.origin,
    403,
    'This request did not come from the school website.',
  );
  assert(req.headers['x-school-request'] === '1', 403, 'Missing request header.');
  assert(
    !req.headers['sec-fetch-site'] ||
      ['same-origin', 'same-site', 'none'].includes(req.headers['sec-fetch-site']),
    403,
    'Cross-site requests are not allowed.',
  );
  if (csrfRequired) {
    requireAuth(auth);
    assert(
      equal(req.headers['x-csrf-token'], auth.session.csrf_token),
      403,
      'Your security token expired. Refresh the page and try again.',
    );
  }
}
export function rateLimit(db, key, max, windowMs) {
  const now = Date.now();
  const current = db.prepare('SELECT * FROM rate_limits WHERE key=?').get(key);
  if (current && current.reset_at > now) {
    assert(current.count < max, 429, 'Too many attempts. Please try again later.');
    db.prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key);
  } else {
    db.prepare(
      'INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,reset_at=excluded.reset_at',
    ).run(key, now + windowMs);
  }
  db.prepare('DELETE FROM rate_limits WHERE reset_at<?').run(now);
}
export function createSession(db, user, cfg) {
  const raw = token(),
    csrf = token(),
    now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?,?)').run(
    hashToken(raw),
    user.id,
    csrf,
    now + cfg.sessionMs,
    now,
    now,
  );
  // Limit active sessions per account.
  db.prepare(
    `DELETE FROM sessions WHERE user_id=? AND token_hash NOT IN
    (SELECT token_hash FROM sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 5)`,
  ).run(user.id, user.id);
  return { raw, csrf };
}
export async function createUser(
  db,
  { name, email, password, role = 'ADMIN' },
  beforeInsert = () => {},
) {
  const now = new Date().toISOString(),
    id = randomUUID();
  const digest = await hashPassword(password);
  beforeInsert();
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1,?,?)').run(
    id,
    name,
    email.toLowerCase(),
    digest,
    role,
    now,
    now,
  );
  return publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
}
