// Creates the database and loads both SQL files using the credentials in .env
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import { dbConfig } from '../server/config.mjs';

// Splits a .sql file into statements, understanding the DELIMITER command
// used by stored procedures and triggers.
function splitSql(raw) {
  // 1. drop /* block comments */ and full-line / trailing "-- comments"
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = text.split(/\r?\n/).map((line) => {
    if (/^\s*--/.test(line)) return '';
    const i = line.search(/\s--\s/);
    if (i > -1 && (line.slice(0, i).match(/'/g) || []).length % 2 === 0) return line.slice(0, i);
    return line;
  });
  // 2. split on the current delimiter (DELIMITER // ... DELIMITER ;)
  const out = []; let delim = ';', buf = '';
  for (const line of lines) {
    const m = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (m) { delim = m[1]; continue; }
    buf += line + '\n';
    if (buf.trimEnd().endsWith(delim)) {
      const stmt = buf.trimEnd().slice(0, -delim.length).trim();
      if (stmt) out.push(stmt);
      buf = '';
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const { database: _db, ...conn } = dbConfig();
const c = await mysql.createConnection({ ...conn, multipleStatements: false });
for (const file of ['01_school_database.sql', '02_website_extension.sql']) {
  const statements = splitSql(readFileSync(new URL(`../database/${file}`, import.meta.url), 'utf8'));
  console.log(`Running ${file} (${statements.length} statements)...`);
  for (const s of statements) {
    try { await c.query(s); }
    catch (e) { console.error('\nFailed statement:\n', s.slice(0, 300), '\n->', e.message); process.exit(1); }
  }
}
await c.end();
console.log('\nDatabase ready. Start the website with: npm run dev');
console.log('Demo logins:  admin@abcprimary.edu / Admin@123   |   sarah@abcprimary.edu / Pass@123   |   nimal.p@mail.com / Pass@123');
