import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

export function prompts() {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, done) {
      if (!muted) process.stdout.write(chunk, encoding);
      done();
    },
  });
  output.isTTY = process.stdout.isTTY;
  output.columns = process.stdout.columns;
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: Boolean(process.stdin.isTTY),
  });
  return {
    ask: async (label, hidden = false) => {
      process.stdout.write(label);
      muted = hidden;
      try {
        return await rl.question('');
      } finally {
        muted = false;
        if (hidden) process.stdout.write('\n');
      }
    },
    close: () => rl.close(),
  };
}
