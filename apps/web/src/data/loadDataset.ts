import {
  type DatasetName,
  type DatasetResponse,
  SNAPSHOT_BASE_PATH,
  datasetApiPath,
  datasetResponseSchema,
  datasetSnapshotSchema,
  snapshotFileName,
} from '@perihelion/data';

export type DatasetLoader<N extends DatasetName> = () => Promise<DatasetResponse<N>>;

/** A server-only attempt the caller can cancel: a background retry that outlives its component must not linger. */
export type ServerDatasetLoader<N extends DatasetName> = (
  signal: AbortSignal,
) => Promise<DatasetResponse<N>>;

export class DatasetLoadError extends Error {
  override name = 'DatasetLoadError';
}

/** How long the first load waits for our server's headers before showing the bundled snapshot instead. */
export const SERVER_TIMEOUT_MS = 4_000;

export interface DatasetFetchOptions {
  fetchImpl?: typeof fetch;
  serverTimeoutMs?: number;
  /** Cancels the server attempt from outside, e.g. when the component that asked unmounts. */
  signal?: AbortSignal;
}

/**
 * Asks our server first, then the snapshot bundled with the web app, so the scene still has data when
 * the server itself is unreachable or asleep. Both answers are validated: neither is trusted blindly.
 */
export async function loadDataset<N extends DatasetName>(
  name: N,
  options: DatasetFetchOptions = {},
): Promise<DatasetResponse<N>> {
  const fromServer = await tryLoadFromServer(name, options);
  if (fromServer !== undefined) return fromServer;
  const fromSnapshot = await tryLoad({
    path: `${SNAPSHOT_BASE_PATH}/${snapshotFileName(name)}`,
    fetchResponse: (path) => (options.fetchImpl ?? fetch)(path),
    parse: (body) =>
      datasetResponseSchema(name).parse({
        ...datasetSnapshotSchema(name).parse(body),
        origin: 'snapshot',
      }),
  });
  if (fromSnapshot !== undefined) return fromSnapshot;
  throw new DatasetLoadError(`No ${name} data: the server and the bundled snapshot both failed`);
}

/** Our server only, never the snapshot: what a background retry asks while the app shows the snapshot. */
export async function loadFromServer<N extends DatasetName>(
  name: N,
  options: DatasetFetchOptions = {},
): Promise<DatasetResponse<N>> {
  const fromServer = await tryLoadFromServer(name, options);
  if (fromServer !== undefined) return fromServer;
  throw new DatasetLoadError(`No ${name} data from the server`);
}

function tryLoadFromServer<N extends DatasetName>(
  name: N,
  options: DatasetFetchOptions,
): Promise<DatasetResponse<N> | undefined> {
  return tryLoad({
    path: datasetApiPath(name),
    fetchResponse: (path) => fetchWithHeaderTimeout(path, options),
    parse: (body) => datasetResponseSchema(name).parse(body),
  });
}

/**
 * The limit covers only the wait for headers: a server that has answered is awake, and on a slow connection the
 * 4 MB NEO body alone can take longer than the limit. `setTimeout` rather than `AbortSignal.timeout`, so tests can
 * drive it with fake timers.
 */
async function fetchWithHeaderTimeout(
  path: string,
  options: DatasetFetchOptions,
): Promise<Response> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.serverTimeoutMs ?? SERVER_TIMEOUT_MS);
  const signals = options.signal ? [timeout.signal, options.signal] : [timeout.signal];
  try {
    return await (options.fetchImpl ?? fetch)(path, { signal: AbortSignal.any(signals) });
  } finally {
    clearTimeout(timer);
  }
}

interface LoadAttempt<T> {
  path: string;
  fetchResponse: (path: string) => Promise<Response>;
  parse: (body: unknown) => T;
}

async function tryLoad<T>({ path, fetchResponse, parse }: LoadAttempt<T>): Promise<T | undefined> {
  try {
    const response = await fetchResponse(path);
    return response.ok ? parse(await response.json()) : undefined;
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return undefined;
  }
}

/** Both the server and the snapshot failed: the app runs on without this dataset. */
export async function loadDatasetOrUndefined<N extends DatasetName>(
  load: DatasetLoader<N>,
): Promise<DatasetResponse<N> | undefined> {
  try {
    return await load();
  } catch (error) {
    console.warn('Dataset unavailable; running without it', error);
    return undefined;
  }
}
