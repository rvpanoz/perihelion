import { systemClock } from '../clock.js';
import type { ServerConfig } from '../config.js';
import { createUpstreamClients } from '../upstream/upstreamClients.js';
import { type DatasetRequests, createDatasetRequests } from './datasetRequests.js';
import { DatasetService } from './datasetService.js';
import { createFileSnapshotReader } from './snapshotReader.js';
import { SqliteDatasetCache, openDatasetDatabase } from './sqliteDatasetCache.js';
import type { DatasetLogger } from './types.js';

export interface Datasets {
  service: DatasetService;
  requests: DatasetRequests;
  close(): void;
}

export function createDatasets(config: ServerConfig, logger: DatasetLogger): Datasets {
  const database = openDatasetDatabase(config.databasePath);
  const service = new DatasetService({
    cache: new SqliteDatasetCache(database),
    snapshots: createFileSnapshotReader(config.snapshotDirectory),
    clock: systemClock,
    logger,
  });
  const clients = createUpstreamClients(systemClock);
  const requests = createDatasetRequests({
    ...clients,
    clock: systemClock,
    nasaApiKey: config.nasaApiKey,
  });
  return { service, requests, close: () => database.close() };
}
