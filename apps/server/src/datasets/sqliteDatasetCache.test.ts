import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { SqliteDatasetCache, openDatasetDatabase } from './sqliteDatasetCache.js';

const DATASET = { dataJson: '[1,2,3]', fetchedAtMs: Date.UTC(2026, 8, 28) };

describe('SqliteDatasetCache', () => {
  it('misses a key it has never stored', () => {
    expect(new SqliteDatasetCache(new DatabaseSync(':memory:')).read('neos')).toBeUndefined();
  });

  it('reads back what it wrote, and a second write replaces the first', () => {
    const cache = new SqliteDatasetCache(new DatabaseSync(':memory:'));
    cache.write('neos', DATASET);
    expect(cache.read('neos')).toEqual(DATASET);
    cache.write('neos', { dataJson: '[]', fetchedAtMs: DATASET.fetchedAtMs + 1 });
    expect(cache.read('neos')).toEqual({ dataJson: '[]', fetchedAtMs: DATASET.fetchedAtMs + 1 });
  });

  it('deletes a row, and deleting a missing key is a no-op', () => {
    const cache = new SqliteDatasetCache(new DatabaseSync(':memory:'));
    cache.write('neos', DATASET);
    cache.delete('neos');
    expect(cache.read('neos')).toBeUndefined();
    expect(() => cache.delete('neos')).not.toThrow();
  });

  it('survives a restart, which is what keeps data flowing with the network down', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'perihelion-')), 'nested', 'cache.sqlite');
    const first = openDatasetDatabase(path);
    new SqliteDatasetCache(first).write('cmes?days=30', DATASET);
    first.close();
    expect(new SqliteDatasetCache(openDatasetDatabase(path)).read('cmes?days=30')).toEqual(DATASET);
  });
});
