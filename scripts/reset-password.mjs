import { createInterface } from 'node:readline/promises';
import mysql from 'mysql2/promise';
import { dbConfig } from '../server/config.mjs';
import { hashPassword } from '../server/auth.mjs';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question('Account email: ')).trim().toLowerCase();
const password = await rl.question('New password (min 10 characters): ');
rl.close();
if (password.length < 10) { console.error('Password too short.'); process.exit(1); }
const c = await mysql.createConnection(dbConfig());
const [r] = await c.query('UPDATE user_account SET password_hash=? WHERE email=?', [await hashPassword(password), email]);
if (r.affectedRows) await c.query('DELETE s FROM web_session s JOIN user_account u ON u.user_id=s.user_id WHERE u.email=?', [email]);
console.log(r.affectedRows ? 'Password updated and old sessions removed.' : 'No account with that email.');
await c.end();
