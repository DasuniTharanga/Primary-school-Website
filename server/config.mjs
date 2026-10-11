import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(resolve(root, '.env'))) loadEnvFile(resolve(root, '.env'));

export function dbConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'WP_MT_Meegahathenna_primary_school',
    charset: 'utf8mb4',
    dateStrings: true, // DATE/DATETIME come back as plain strings (no timezone surprises)
    decimalNumbers: true, // DECIMAL marks come back as numbers
  };
}

export function config(overrides = {}) {
  const production = process.env.NODE_ENV === 'production';
  const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
  return {
    production,
    origin,
    host: process.env.HOST || '127.0.0.1',
    port: Number(process.env.PORT || 3001),
    distPath: resolve(root, 'dist'),
    sessionMs: Math.min(24, Math.max(1, Number(process.env.SESSION_HOURS || 8))) * 3600000,
    ...overrides,
  };
}
