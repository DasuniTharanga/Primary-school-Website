import { spawn } from 'node:child_process';
const run = (args) => spawn(process.execPath, args, { stdio: 'inherit' });
const server = run(['--watch', 'server/index.mjs']);
const client = run(['node_modules/vite/bin/vite.js']);
const stop = () => { server.kill(); client.kill(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
server.on('exit', (c) => c && stop()); client.on('exit', (c) => c && stop());
