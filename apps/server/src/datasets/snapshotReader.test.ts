import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFileSnapshotReader } from './snapshotReader.js';

function snapshotDir(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'perihelion-snapshot-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(directory, name), text);
  return directory;
}

describe('createFileSnapshotReader', () => {
  it('reads a valid snapshot as a cached dataset', async () => {
    const directory = snapshotDir({
      'cmes.json': '{"fetchedAt":"2026-09-01T00:00:00.000Z","data":[]}',
    });
    await expect(createFileSnapshotReader(directory).read('cmes')).resolves.toEqual({
      dataJson: '[]',
      fetchedAtMs: Date.UTC(2026, 8, 1),
    });
  });

  it('has nothing to offer when the file is missing', async () => {
    await expect(createFileSnapshotReader(snapshotDir({})).read('neos')).resolves.toBeUndefined();
  });

  it('fails loudly on an invalid snapshot, which would be a bug in our own repo', async () => {
    const directory = snapshotDir({ 'cmes.json': '{"fetchedAt":"yesterday","data":[]}' });
    await expect(createFileSnapshotReader(directory).read('cmes')).rejects.toThrow();
  });
});
