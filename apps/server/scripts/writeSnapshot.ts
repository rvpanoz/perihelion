import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  DATASET_NAMES,
  type DatasetName,
  NEO_PAYLOAD_BUDGET_BYTES,
  snapshotFileName,
} from '@perihelion/data';
import { systemClock } from '../src/clock.js';
import { type ServerConfig, readServerConfig } from '../src/config.js';
import { createDatasetRequests, defaultDatasetRequests } from '../src/datasets/datasetRequests.js';
import { createUpstreamClients } from '../src/upstream/upstreamClients.js';

type SnapshotTexts = Record<DatasetName, string>;

/** Same queries, validation and normalization as the live server, so a snapshot is a real answer. */
async function fetchAll(config: ServerConfig): Promise<SnapshotTexts> {
  const clients = createUpstreamClients(systemClock);
  const requests = defaultDatasetRequests(
    createDatasetRequests({ ...clients, clock: systemClock, nasaApiKey: config.nasaApiKey }),
  );
  const texts: Partial<SnapshotTexts> = {};
  for (const name of DATASET_NAMES) {
    const data = await requests[name].fetchData();
    texts[name] = `${JSON.stringify({ fetchedAt: new Date().toISOString(), data })}\n`;
  }
  return texts as SnapshotTexts;
}

function assertNeoBudget(text: string): void {
  const gzippedBytes = gzipSync(text).byteLength;
  console.log(`neos snapshot: ${gzippedBytes} bytes gzipped (budget ${NEO_PAYLOAD_BUDGET_BYTES})`);
  if (gzippedBytes > NEO_PAYLOAD_BUDGET_BYTES)
    throw new Error('NEO snapshot exceeds the gzip budget');
}

/** Everything is fetched and checked before anything is written, so a failure never leaves a mixed set. */
async function main(): Promise<void> {
  // The directory the server falls back to (apps/web/public/snapshot, which Vite serves as /snapshot/*.json).
  const config = readServerConfig(process.env);
  const texts = await fetchAll(config);
  assertNeoBudget(texts.neos);
  await mkdir(config.snapshotDirectory, { recursive: true });
  for (const name of DATASET_NAMES) {
    const target = join(config.snapshotDirectory, snapshotFileName(name));
    await writeFile(target, texts[name]);
    console.log(`wrote ${target}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
