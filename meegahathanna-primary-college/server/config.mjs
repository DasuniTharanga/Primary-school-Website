import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(resolve(root, '.env'))) loadEnvFile(resolve(root, '.env'));

export function config(overrides = {}) {
  const production = process.env.NODE_ENV === 'production';
  const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
  const parsed = new URL(origin);
  if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('APP_ORIGIN must be an origin with no path or trailing slash.');
  }
  if (production && parsed.protocol !== 'https:')
    throw new Error('Production APP_ORIGIN must use HTTPS.');
  return {
    production,
    origin,
    host: process.env.HOST || '127.0.0.1',
    port: Number(process.env.PORT || 3001),
    dbPath: resolve(root, process.env.DATABASE_PATH || 'data/school.db'),
    uploadPath: resolve(root, process.env.UPLOAD_PATH || 'data/uploads'),
    distPath: resolve(root, 'dist'),
    sessionMs: Math.min(24, Math.max(1, Number(process.env.SESSION_HOURS || 8))) * 3600000,
    idleMs: Math.min(120, Math.max(5, Number(process.env.SESSION_IDLE_MINUTES || 60))) * 60000,
    trustProxy: process.env.TRUST_PROXY === 'true',
    ...overrides,
  };
}
