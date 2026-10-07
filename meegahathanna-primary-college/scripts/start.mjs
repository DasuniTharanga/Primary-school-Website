import '../server/config.mjs';

// A built local preview uses the backend port. Production always keeps the
// explicitly configured HTTPS origin.
if (
  process.env.NODE_ENV !== 'production' &&
  (!process.env.APP_ORIGIN || process.env.APP_ORIGIN === 'http://localhost:5173')
) {
  process.env.APP_ORIGIN = `http://localhost:${process.env.PORT || 3001}`;
}
await import('../server/index.mjs');
