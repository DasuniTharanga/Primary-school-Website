import { existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, root } from '../server/config.mjs';
import { openDatabase, seedDatabase, audit } from '../server/db.mjs';
import { createUser } from '../server/security.mjs';
import * as v from '../server/validation.mjs';
import { prompts } from './prompt.mjs';

if (Number(process.versions.node.split('.')[0]) !== 24)
  throw new Error('Use Node.js 24 LTS for this project.');
if (!existsSync(resolve(root, '.env')))
  copyFileSync(resolve(root, '.env.example'), resolve(root, '.env'));
const cfg = config(),
  db = openDatabase(cfg.dbPath);
seedDatabase(db);
try {
  if (db.prepare("SELECT id FROM users WHERE role='ADMIN' AND active=1").get()) {
    console.log(
      'Database is ready. An administrator already exists. Use Staff accounts to add more accounts, or npm run admin:reset-password for local recovery.',
    );
  } else {
    console.log('Create the school administrator. No default password is included.\n');
    const prompt = prompts();
    try {
      const name = v.text(
        (await prompt.ask('Administrator name: ')) || 'School Administrator',
        'Name',
        2,
        100,
      );
      const email = v.email(await prompt.ask('Administrator email: '));
      const password = v.password(
        await prompt.ask('Password (12+ characters, letters and numbers): ', true),
      );
      const confirmation = await prompt.ask('Confirm password: ', true);
      v.choice(password === confirmation, 'password confirmation', [true]);
      const user = await createUser(db, { name, email, password });
      audit(db, user, 'Created initial administrator');
      console.log(`\nSetup complete. Website login: ${cfg.origin}/login`);
      console.log(
        cfg.production
          ? 'Start the built server with npm start.'
          : 'Start the website with npm run dev.',
      );
    } finally {
      prompt.close();
    }
  }
} catch (error) {
  console.error('Setup stopped:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
