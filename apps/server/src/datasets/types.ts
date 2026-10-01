import type { DatasetName, DatasetOrigin } from '@perihelion/data';

/** Validated, normalized data kept as JSON text so megabyte payloads are never re-parsed per request. */
export interface CachedDataset {
  dataJson: string;
  fetchedAtMs: number;
}

export interface ServedDataset extends CachedDataset {
  origin: DatasetOrigin;
}

export interface DatasetCache {
  read(cacheKey: string): CachedDataset | undefined;
  write(cacheKey: string, dataset: CachedDataset): void;
  delete(cacheKey: string): void;
}

export interface SnapshotReader {
  read(name: DatasetName): Promise<CachedDataset | undefined>;
}

/** One dataset query: `fetchData` resolves to data already validated against its API schema. */
export interface DatasetRequest {
  cacheKey: string;
  ttlMs: number;
  snapshotName: DatasetName;
  fetchData(): Promise<unknown>;
  /** Whether a cached entry still fits the schema, e.g. one written before a schema change. */
  accepts(dataJson: string): boolean;
}

/** The slice of Fastify's pino logger the service needs, so tests can pass a plain recorder. */
export interface DatasetLogger {
  warn(details: object, message: string): void;
}
