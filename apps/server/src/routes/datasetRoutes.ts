import {
  DEFAULT_CLOSE_APPROACH_DAYS,
  DEFAULT_CME_DAYS,
  MAX_WINDOW_DAYS,
  datasetApiPath,
  daysQuerySchema,
} from '@perihelion/data';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { DatasetRequests } from '../datasets/datasetRequests.js';
import type { DatasetService } from '../datasets/datasetService.js';
import type { ServedDataset } from '../datasets/types.js';
import { InvalidQueryError } from '../errors.js';

interface DatasetRouteDependencies {
  service: Pick<DatasetService, 'read'>;
  requests: DatasetRequests;
}

export function registerDatasetRoutes(
  app: FastifyInstance,
  { service, requests }: DatasetRouteDependencies,
): void {
  app.get(datasetApiPath('neos'), async (_request, reply) =>
    sendDataset(reply, await service.read(requests.neos())),
  );
  app.get(datasetApiPath('close-approaches'), async (request, reply) => {
    const days = readDays(request.query, DEFAULT_CLOSE_APPROACH_DAYS);
    return sendDataset(reply, await service.read(requests.closeApproaches(days)));
  });
  app.get(datasetApiPath('cmes'), async (request, reply) => {
    const days = readDays(request.query, DEFAULT_CME_DAYS);
    return sendDataset(reply, await service.read(requests.cmes(days)));
  });
}

function readDays(query: unknown, defaultDays: number): number {
  const parsed = daysQuerySchema(defaultDays).safeParse(query);
  if (!parsed.success)
    throw new InvalidQueryError(`days must be a whole number from 1 to ${MAX_WINDOW_DAYS}`);
  return parsed.data.days;
}

/** The cached JSON is spliced in unparsed: /api/neos is megabytes, and it was validated before caching. */
function sendDataset(reply: FastifyReply, dataset: ServedDataset): FastifyReply {
  const fetchedAt = new Date(dataset.fetchedAtMs).toISOString();
  const body = `{"fetchedAt":"${fetchedAt}","origin":"${dataset.origin}","data":${dataset.dataJson}}`;
  return reply.type('application/json; charset=utf-8').send(body);
}
