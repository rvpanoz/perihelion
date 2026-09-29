import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type DatasetName, datasetSnapshotSchema, snapshotFileName } from '@perihelion/data';
import type { CachedDataset, SnapshotReader } from './types.js';

/** Reads each committed fallback copy once; it only changes when `npm run snapshot` is re-run. */
export function createFileSnapshotReader(directory: string): SnapshotReader {
  const loaded = new Map<DatasetName, Promise<CachedDataset | undefined>>();
  return {
    read(name) {
      const snapshot = loaded.get(name) ?? loadSnapshot(directory, name);
      loaded.set(name, snapshot);
      return snapshot;
    },
  };
}

async function loadSnapshot(
  directory: string,
  name: DatasetName,
): Promise<CachedDataset | undefined> {
  const text = await readOptionalFile(join(directory, snapshotFileName(name)));
  if (text === undefined) return undefined;
  const snapshot = datasetSnapshotSchema(name).parse(JSON.parse(text));
  return { dataJson: JSON.stringify(snapshot.data), fetchedAtMs: Date.parse(snapshot.fetchedAt) };
}

async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
