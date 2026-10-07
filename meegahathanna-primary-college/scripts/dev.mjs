import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config, root } from '../server/config.mjs';

const cfg = config();
if (cfg.production) throw new Error('Set NODE_ENV=development in .env before running npm run dev.');
if (cfg.port !== 3001) throw new Error('Development uses PORT=3001. Restore this value in .env.');
const children = [
  spawn(
    process.execPath,
    ['--watch', fileURLToPath(new URL('../server/index.mjs', import.meta.url))],
    { cwd: root, stdio: 'inherit' },
  ),
  spawn(
    process.execPath,
    [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))],
    { cwd: root, stdio: 'inherit' },
  ),
];
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    close(1);
  });
  child.on('exit', (code) => {
    if (!closing) close(code || 0);
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => close());
