import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Build command failed (${code}).`)),
    );
  });
}
console.log('Checking TypeScript…');
await run([
  fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)),
  '--noEmit',
  '-p',
  'tsconfig.app.json',
]);
await run([fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'build']);
