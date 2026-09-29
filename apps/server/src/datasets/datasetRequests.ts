import {
  DATASET_DATA_SCHEMAS,
  DEFAULT_CLOSE_APPROACH_DAYS,
  DEFAULT_CME_DAYS,
  type DatasetName,
  type UpstreamQuery,
  cadQuery,
  closeApproachWindow,
  cmeWindow,
  donkiCmeQuery,
  donkiCmeResponseSchema,
  jplColumnarResponseSchema,
  sbdbNeoQuery,
  toCloseApproaches,
  toCmes,
  toNeoCatalog,
} from '@perihelion/data';
import type { Clock } from '../clock.js';
import type { HttpClient } from '../upstream/httpClient.js';
import { upstreamUrl } from '../upstream/upstreamUrl.js';
import type { DatasetRequest } from './types.js';

const HOUR_MS = 3_600_000;

/** NEO orbits change slowly; close approaches and CMEs are news. */
export const DATASET_TTL_MS = {
  neos: 24 * HOUR_MS,
  'close-approaches': HOUR_MS,
  cmes: HOUR_MS,
} as const satisfies Record<DatasetName, number>;

export interface DatasetRequests {
  neos(): DatasetRequest;
  closeApproaches(days: number): DatasetRequest;
  cmes(days: number): DatasetRequest;
}

interface DatasetRequestDependencies {
  jpl: HttpClient;
  donki: HttpClient;
  clock: Clock;
  nasaApiKey: string;
}

export function createDatasetRequests(deps: DatasetRequestDependencies): DatasetRequests {
  return {
    neos: () => neoRequest(deps),
    closeApproaches: (days) => closeApproachRequest(deps, days),
    cmes: (days) => cmeRequest(deps, days),
  };
}

function neoRequest(deps: DatasetRequestDependencies): DatasetRequest {
  return datasetRequest({
    name: 'neos',
    cacheKey: 'neos',
    fetchData: async () =>
      toNeoCatalog(jplColumnarResponseSchema.parse(await getJson(deps.jpl, sbdbNeoQuery()))),
  });
}

function closeApproachRequest(deps: DatasetRequestDependencies, days: number): DatasetRequest {
  return datasetRequest({
    name: 'close-approaches',
    cacheKey: `close-approaches?days=${days}`,
    fetchData: async () => {
      const query = cadQuery(closeApproachWindow(deps.clock.now(), days));
      return toCloseApproaches(jplColumnarResponseSchema.parse(await getJson(deps.jpl, query)));
    },
  });
}

function cmeRequest(deps: DatasetRequestDependencies, days: number): DatasetRequest {
  return datasetRequest({
    name: 'cmes',
    cacheKey: `cmes?days=${days}`,
    fetchData: async () => {
      const query = donkiCmeQuery(cmeWindow(deps.clock.now(), days), deps.nasaApiKey);
      return toCmes(donkiCmeResponseSchema.parse(await getJson(deps.donki, query)));
    },
  });
}

function getJson(client: HttpClient, query: UpstreamQuery): Promise<unknown> {
  return client.getJson(upstreamUrl(query));
}

interface DatasetRequestSpec {
  name: DatasetName;
  cacheKey: string;
  fetchData: () => Promise<unknown>;
}

/** The final schema check guarantees the cache only ever holds what the API promises. */
function datasetRequest({ name, cacheKey, fetchData }: DatasetRequestSpec): DatasetRequest {
  return {
    cacheKey,
    ttlMs: DATASET_TTL_MS[name],
    snapshotName: name,
    fetchData: async () => DATASET_DATA_SCHEMAS[name].parse(await fetchData()),
  };
}

/** What the scheduler keeps warm and what `npm run snapshot` writes. */
export function defaultDatasetRequests(
  requests: DatasetRequests,
): Record<DatasetName, DatasetRequest> {
  return {
    neos: requests.neos(),
    'close-approaches': requests.closeApproaches(DEFAULT_CLOSE_APPROACH_DAYS),
    cmes: requests.cmes(DEFAULT_CME_DAYS),
  };
}
