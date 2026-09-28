import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  type HorizonsClient,
  generateAsteroidFixtures,
  generatePlanetFixtures,
  horizonsUrl,
  readHorizonsResponse,
} from '../src/index';

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

/** Both sets are fetched before either is written, so a failure never leaves a mismatched pair. */
async function main(): Promise<void> {
  const planets = await generatePlanetFixtures(horizonsClient);
  const asteroids = await generateAsteroidFixtures(horizonsClient);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFixture('planets.json', planets);
  await writeFixture('asteroids.json', asteroids);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
