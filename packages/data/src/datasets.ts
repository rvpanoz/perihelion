import { z } from 'zod';
import { closeApproachSchema } from './closeApproach';
import { cmeSchema } from './cme';
import { neoCatalogSchema } from './neoCatalog';

/** Path prefix for every data route served by apps/server; the web app only ever calls these. */
export const API_BASE_PATH = '/api';
/** Where the web app finds the committed fallback copies (apps/web/public/snapshot/). */
export const SNAPSHOT_BASE_PATH = '/snapshot';

export const DATASET_NAMES = ['neos', 'close-approaches', 'cmes'] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

export const DATASET_DATA_SCHEMAS = {
  neos: neoCatalogSchema,
  'close-approaches': z.array(closeApproachSchema),
  cmes: z.array(cmeSchema),
} as const satisfies Record<DatasetName, z.ZodType>;
export type DatasetData<N extends DatasetName> = z.infer<(typeof DATASET_DATA_SCHEMAS)[N]>;

/** fresh: within its TTL; stale: past it while a refresh runs; snapshot: the committed fallback. */
export const DATASET_ORIGINS = ['fresh', 'stale', 'snapshot'] as const;
export type DatasetOrigin = (typeof DATASET_ORIGINS)[number];

/** The shape of apps/web/public/snapshot/<name>.json. */
export function datasetSnapshotSchema<N extends DatasetName>(name: N) {
  return z.object({ fetchedAt: z.iso.datetime(), data: DATASET_DATA_SCHEMAS[name] });
}

/** The shape of GET /api/<name>; the web app validates it, trusting our server no more than NASA. */
export function datasetResponseSchema<N extends DatasetName>(name: N) {
  return datasetSnapshotSchema(name).extend({ origin: z.enum(DATASET_ORIGINS) });
}

export type DatasetSnapshot<N extends DatasetName> = z.infer<
  ReturnType<typeof datasetSnapshotSchema<N>>
>;
export type DatasetResponse<N extends DatasetName> = z.infer<
  ReturnType<typeof datasetResponseSchema<N>>
>;

export function datasetApiPath(name: DatasetName): string {
  return `${API_BASE_PATH}/${name}`;
}

export function snapshotFileName(name: DatasetName): string {
  return `${name}.json`;
}

/** Bounds `days` so a caller cannot create unbounded cache keys or upstream queries. */
export const MAX_WINDOW_DAYS = 60;

export function daysQuerySchema(defaultDays: number) {
  return z.object({
    days: z.coerce.number().int().min(1).max(MAX_WINDOW_DAYS).default(defaultDays),
  });
}
