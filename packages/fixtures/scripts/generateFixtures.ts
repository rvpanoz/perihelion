import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// Imports skip the package index on purpose: it re-exports the loaders, which import the very data files this
// script writes, so a new fixture set could never be generated for the first time.
import { type FixtureSet, selectFixtureSets } from '../src/fixtureSets';
import {
  type HorizonsClient,
  generateAsteroidFixtures,
  generatePlanetFixtures,
  generateSunOrientationFixtures,
} from '../src/generate';
import { horizonsUrl } from '../src/horizonsQuery';
import { readHorizonsResponse } from '../src/horizonsResponse';

// Horizons asks API users to send one query at a time; a pause keeps us well inside that.
const PAUSE_BETWEEN_QUERIES_MS = 1_000;
const DATA_DIR = new URL('../data/', import.meta.url);

const horizonsClient: HorizonsClient = {
  async fetchResponse(params) {
    const response = await fetch(horizonsUrl(params));
    const body: unknown = await response.json();
    await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_QUERIES_MS));
    return readHorizonsResponse(body);
  },
};

async function writeFixture(fileName: string, data: unknown): Promise<void> {
  const target = new URL(fileName, DATA_DIR);
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${fileURLToPath(target)}`);
}

const GENERATORS: Readonly<
  Record<FixtureSet, { fileName: string; generate: (client: HorizonsClient) => Promise<unknown> }>
> = {
  planets: { fileName: 'planets.json', generate: generatePlanetFixtures },
  asteroids: { fileName: 'asteroids.json', generate: generateAsteroidFixtures },
  sun: { fileName: 'sun-orientation.json', generate: generateSunOrientationFixtures },
};

/**
 * Every selected set is fetched before any is written, so a failure never leaves a mismatched pair. Naming sets
 * (`npm run fixtures -- sun`) leaves the others' ground truth, and their calibrated tolerances, untouched.
 */
async function main(): Promise<void> {
  const sets = selectFixtureSets(process.argv.slice(2));
  const generated: [string, unknown][] = [];
  for (const set of sets) {
    const { fileName, generate } = GENERATORS[set];
    generated.push([fileName, await generate(horizonsClient)]);
  }
  await mkdir(DATA_DIR, { recursive: true });
  for (const [fileName, data] of generated) await writeFixture(fileName, data);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
