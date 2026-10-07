import { backup } from 'node:sqlite';
import { mkdirSync, cpSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, root } from '../server/config.mjs';
import { openDatabase } from '../server/db.mjs';

const cfg = config();
if (!existsSync(cfg.dbPath)) throw new Error('No school database found. Run npm run setup first.');
const folder = resolve(root, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(folder, { recursive: true, mode: 0o700 });
const db = openDatabase(cfg.dbPath);
try {
  await backup(db, resolve(folder, 'school.db'));
  if (existsSync(cfg.uploadPath))
    cpSync(cfg.uploadPath, resolve(folder, 'uploads'), { recursive: true });
  writeFileSync(
    resolve(folder, 'BACKUP.txt'),
    'School database and uploads backup. Treat as confidential. To restore, stop the server, preserve the current data directory, copy school.db and uploads into the configured paths, and clear sessions before restarting. See docs/OPERATIONS.md.\n',
    { mode: 0o600 },
  );
  console.log('Backup created:', folder);
} finally {
  db.close();
}
