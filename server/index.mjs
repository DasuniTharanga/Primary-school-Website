import { config } from './config.mjs';
import { createApplication } from './app.mjs';

const cfg = config();
let app;
try {
  app = await createApplication(cfg);
} catch (e) {
  console.error('\nCould not connect to MySQL: ' + (e.code || e.message));
  console.error('1) Is MySQL running?  2) Did you copy .env.example to .env and set DB_PASSWORD?  3) Did you run: npm run db:setup ?\n');
  process.exit(1);
}
app.server.listen(cfg.port, cfg.host, () => {
  console.log(`School API running on http://${cfg.host}:${cfg.port}`);
  console.log(`Website origin: ${cfg.origin}`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, async () => { await app.close(); process.exit(0); });
