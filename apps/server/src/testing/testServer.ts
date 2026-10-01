import { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { createDatasetRequests } from '../datasets/datasetRequests.js';
import { DatasetService } from '../datasets/datasetService.js';
import { SqliteDatasetCache } from '../datasets/sqliteDatasetCache.js';
import type { SnapshotReader } from '../datasets/types.js';
import { registerDatasetRoutes } from '../routes/datasetRoutes.js';
import { NO_SNAPSHOTS } from './fakeSnapshots.js';
import { FakeUpstream } from './fakeUpstream.js';
import { RECORDED_CAD_DESIGNATIONS, neoCatalogOf } from './testCatalog.js';
import { TestClock } from './testClock.js';
import { TEST_NOW_MS } from './testConstants.js';

interface TestServerOptions {
  upstream?: FakeUpstream;
  snapshots?: SnapshotReader;
}

export interface TestServer {
  app: FastifyInstance;
  upstream: FakeUpstream;
  clock: TestClock;
  warnings: string[];
}

/** The real app, routes, service and SQLite cache; only the network, clock and snapshots are fake. */
export async function createTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  const upstream = options.upstream ?? new FakeUpstream();
  const clock = new TestClock(TEST_NOW_MS);
  const warnings: string[] = [];
  const logger = { warn: (_details: object, message: string) => void warnings.push(message) };
  const service = new DatasetService({
    cache: new SqliteDatasetCache(new DatabaseSync(':memory:')),
    snapshots: options.snapshots ?? NO_SNAPSHOTS,
    clock,
    logger,
  });
  // A catalog holding every recorded CAD row, so route tests need no lookups; the join has its own tests.
  const catalog = neoCatalogOf(RECORDED_CAD_DESIGNATIONS);
  const requests = createDatasetRequests({
    jpl: upstream,
    donki: upstream,
    clock,
    readNeoCatalog: () => Promise.resolve(catalog),
    logger,
  });
  const app = await buildApp();
  registerDatasetRoutes(app, { service, requests });
  return { app, upstream, clock, warnings };
}
