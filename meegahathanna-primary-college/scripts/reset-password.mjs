import { config } from '../server/config.mjs';
import { openDatabase, transaction, audit } from '../server/db.mjs';
import { hashPassword } from '../server/security.mjs';
import * as v from '../server/validation.mjs';
import { prompts } from './prompt.mjs';

const db = openDatabase(config().dbPath),
  prompt = prompts();
try {
  const email = v.email(await prompt.ask('Staff account email: '));
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user) throw new Error('This staff account does not exist.');
  const password = v.password(
    await prompt.ask('New password (12+ characters, letters and numbers): ', true),
  );
  if (password !== (await prompt.ask('Confirm new password: ', true)))
    throw new Error('The passwords do not match.');
  const digest = await hashPassword(password);
  transaction(db, () => {
    db.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?').run(
      digest,
      new Date().toISOString(),
      user.id,
    );
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
    audit(db, null, 'Locally reset staff password', user.id);
  });
  console.log('Password changed. All sessions for this account were revoked.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  prompt.close();
  db.close();
}
