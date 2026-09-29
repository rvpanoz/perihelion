import compress from '@fastify/compress';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { DatasetUnavailableError, InvalidQueryError } from './errors.js';

export async function buildApp(options: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify(options);
  // /api/neos is ~40k rows; gzip on the wire is what keeps it inside the 2 MB budget.
  await app.register(compress);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof InvalidQueryError) return reply.code(400).send({ error: error.message });
    if (error instanceof DatasetUnavailableError)
      return reply.code(503).send({ error: error.message });
    return reply.send(error);
  });
  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
