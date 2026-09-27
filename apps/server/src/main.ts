import { buildApp } from './app.js';

const DEFAULT_PORT = 8787;

const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
const app = buildApp({ logger: true });

try {
  await app.listen({ port, host: '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
