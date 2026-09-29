import {
  type DatasetName,
  type DatasetResponse,
  SNAPSHOT_BASE_PATH,
  datasetApiPath,
  datasetResponseSchema,
  datasetSnapshotSchema,
  snapshotFileName,
} from '@perihelion/data';

export class DatasetLoadError extends Error {
  override name = 'DatasetLoadError';
}

/**
 * Asks our server first, then the snapshot bundled with the web app, so the scene still has data when
 * the server itself is unreachable. Both answers are validated: neither is trusted blindly.
 */
export async function loadDataset<N extends DatasetName>(
  name: N,
  fetchImpl: typeof fetch = fetch,
): Promise<DatasetResponse<N>> {
  const fromServer = await tryLoad({
    fetchImpl,
    path: datasetApiPath(name),
    parse: (body) => datasetResponseSchema(name).parse(body),
  });
  if (fromServer !== undefined) return fromServer;
  const fromSnapshot = await tryLoad({
    fetchImpl,
    path: `${SNAPSHOT_BASE_PATH}/${snapshotFileName(name)}`,
    parse: (body) =>
      datasetResponseSchema(name).parse({
        ...datasetSnapshotSchema(name).parse(body),
        origin: 'snapshot',
      }),
  });
  if (fromSnapshot !== undefined) return fromSnapshot;
  throw new DatasetLoadError(`No ${name} data: the server and the bundled snapshot both failed`);
}

interface LoadAttempt<T> {
  fetchImpl: typeof fetch;
  path: string;
  parse: (body: unknown) => T;
}

async function tryLoad<T>({ fetchImpl, path, parse }: LoadAttempt<T>): Promise<T | undefined> {
  try {
    const response = await fetchImpl(path);
    return response.ok ? parse(await response.json()) : undefined;
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return undefined;
  }
}
