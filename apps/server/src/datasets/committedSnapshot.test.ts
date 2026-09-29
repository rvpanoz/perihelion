import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DATASET_NAMES, NEO_PAYLOAD_BUDGET_BYTES, snapshotFileName } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import { readServerConfig } from '../config.js';
import { createFileSnapshotReader } from './snapshotReader.js';

// The default directory: the one `npm run snapshot` writes and the server falls back to.
const SNAPSHOT_DIR = readServerConfig({}).snapshotDirectory;

describe('the snapshot committed to apps/web', () => {
  it.each(DATASET_NAMES)('has a valid %s snapshot', async (name) => {
    await expect(createFileSnapshotReader(SNAPSHOT_DIR).read(name)).resolves.toBeDefined();
  });

  it('keeps the NEO snapshot inside the gzip budget', async () => {
    const text = await readFile(join(SNAPSHOT_DIR, snapshotFileName('neos')));
    expect(gzipSync(text).byteLength).toBeLessThanOrEqual(NEO_PAYLOAD_BUDGET_BYTES);
  });
});
