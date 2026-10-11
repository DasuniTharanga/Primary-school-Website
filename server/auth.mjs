import { scrypt as rawScrypt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(rawScrypt);

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function assert(cond, status, message) { if (!cond) throw new HttpError(status, message); }

export const sha256 = (v) => createHash('sha256').update(v).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${key.toString('hex')}`;
}

/** Supports scrypt hashes and the legacy SHA2(...,256) hashes from the original SQL file. */
export async function verifyPassword(password, stored) {
  if (stored.startsWith('scrypt$')) {
    const [, salt, expected] = stored.split('$');
    const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
    return { ok: safeEqual(key.toString('hex'), expected), legacy: false };
  }
  return { ok: /^[0-9a-f]{64}$/i.test(stored) && safeEqual(sha256(password), stored.toLowerCase()), legacy: true };
}

export const COOKIE = 'school_session';
export function sessionCookie(cfg, value, maxAgeSec) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${cfg.production ? '; Secure' : ''}`;
}
export function readCookie(req, name) {
  const pair = (req.headers.cookie || '').split(';').map((p) => p.trim()).find((p) => p.startsWith(name + '='));
  return pair ? pair.slice(name.length + 1) : '';
}
