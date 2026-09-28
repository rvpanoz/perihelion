import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { CachedDataset, DatasetCache } from './types.js';

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS dataset_cache (
  cache_key TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  fetched_at_ms INTEGER NOT NULL
) STRICT`;
const SELECT = 'SELECT data_json, fetched_at_ms FROM dataset_cache WHERE cache_key = ?';
const UPSERT = `INSERT INTO dataset_cache (cache_key, data_json, fetched_at_ms) VALUES (?, ?, ?)
  ON CONFLICT (cache_key) DO UPDATE SET data_json = excluded.data_json, fetched_at_ms = excluded.fetched_at_ms`;

/** Creates the parent directory, since the default path (.cache/) does not exist on a fresh checkout. */
export function openDatasetDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  return new DatabaseSync(path);
}

export class SqliteDatasetCache implements DatasetCache {
  readonly #select: StatementSync;
  readonly #upsert: StatementSync;

  constructor(database: DatabaseSync) {
    database.exec(CREATE_TABLE);
    this.#select = database.prepare(SELECT);
    this.#upsert = database.prepare(UPSERT);
  }

  read(cacheKey: string): CachedDataset | undefined {
    const row = this.#select.get(cacheKey);
    if (row === undefined) return undefined;
    const { data_json: dataJson, fetched_at_ms: fetchedAtMs } = row;
    if (typeof dataJson !== 'string' || typeof fetchedAtMs !== 'number') {
      throw new TypeError(`Corrupt cache row for ${cacheKey}`);
    }
    return { dataJson, fetchedAtMs };
  }

  write(cacheKey: string, dataset: CachedDataset): void {
    this.#upsert.run(cacheKey, dataset.dataJson, dataset.fetchedAtMs);
  }
}
