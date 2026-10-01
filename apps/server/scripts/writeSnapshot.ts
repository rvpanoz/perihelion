import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  DATASET_NAMES,
  type DatasetName,
  NEO_PAYLOAD_BUDGET_BYTES,
  type NeoCatalog,
  neoCatalogSchema,
  snapshotFileName,
} from '@perihelion/data';
import { systemClock } from '../src/clock.js';
import { type ServerConfig, readServerConfig } from '../src/config.js';
import { createDatasetRequests, defaultDatasetRequests } from '../src/datasets/datasetRequests.js';
import { createUpstreamClients } from '../src/upstream/upstreamClients.js';

type SnapshotTexts = Partial<Record<DatasetName, string>>;

/** No names writes every dataset; names let one be refreshed while another upstream is down (#85). */
function selectedNames(args: readonly string[]): readonly DatasetName[] {
  if (args.length === 0) return DATASET_NAMES;
  return args.map((arg) => {
    const name = DATASET_NAMES.find((known) => known === arg);
    if (name === undefined)
      throw new Error(`Unknown dataset "${arg}": ${DATASET_NAMES.join(', ')}`);
    return name;
  });
}

/** Same queries, validation and normalization as the live server, so a snapshot is a real answer. */
async function fetchAll(
  config: ServerConfig,
  names: readonly DatasetName[],
): Promise<SnapshotTexts> {
  const requests = defaultDatasetRequests(snapshotRequests(config));
  const texts: SnapshotTexts = {};
  for (const name of names) {
    const data = await requests[name].fetchData();
    texts[name] = `${JSON.stringify({ fetchedAt: new Date().toISOString(), data })}\n`;
  }
  return texts;
}

/** No server here, so the close approaches join a catalog fetched once for this run. */
function snapshotRequests(config: ServerConfig) {
  const clients = createUpstreamClients(systemClock);
  let catalog: Promise<NeoCatalog> | undefined;
  const requests = createDatasetRequests({
    ...clients,
    clock: systemClock,
    nasaApiKey: config.nasaApiKey,
    readNeoCatalog: () =>
      (catalog ??= requests
        .neos()
        .fetchData()
        .then((d) => neoCatalogSchema.parse(d))),
    logger: console,
  });
  return requests;
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
  const names = selectedNames(process.argv.slice(2));
  const texts = await fetchAll(config, names);
  if (texts.neos !== undefined) assertNeoBudget(texts.neos);
  await mkdir(config.snapshotDirectory, { recursive: true });
  for (const name of names) {
    const target = join(config.snapshotDirectory, snapshotFileName(name));
    await writeFile(target, texts[name] ?? '');
    console.log(`wrote ${target}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
