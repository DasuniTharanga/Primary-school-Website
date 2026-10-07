import { config } from './config.mjs';
import { createApplication } from './app.mjs';

const cfg = config();
const app = await createApplication(cfg);
app.server.listen(cfg.port, cfg.host, () => {
  console.log(`School API listening on ${cfg.host}:${cfg.port}`);
  console.log(`Website origin: ${cfg.origin}`);
  if (!app.db.prepare('SELECT id FROM users LIMIT 1').get())
    console.log('Create the first administrator with: npm run setup');
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
