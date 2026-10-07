import { config } from '../server/config.mjs';
import { openDatabase, audit } from '../server/db.mjs';
const db = openDatabase(config().dbPath);
try {
  const result = db.prepare('DELETE FROM sessions').run();
  audit(db, null, 'Locally revoked all sessions');
  console.log(`Revoked ${result.changes} sessions. Staff must sign in again.`);
} finally {
  db.close();
}
