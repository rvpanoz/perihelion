import {
  type AsteroidFixture,
  type AsteroidFixtures,
  type ElementsRecord,
  type PlanetFixture,
  type PlanetFixtures,
  type StateRecord,
  asteroidFixturesSchema,
  planetFixturesSchema,
} from './fixtureSchema';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_HORIZONS_COMMANDS,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  type AsteroidName,
  PLANET_HORIZONS_IDS,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
  type PlanetName,
} from './fixtureSpec';
import {
  type BodyQuery,
  HORIZONS_API_URL,
  HORIZONS_FRAME_PARAMS,
  buildElementsQuery,
  buildVectorsQuery,
} from './horizonsQuery';
import { toElementsRecord, toStateRecord } from './horizonsRecords';
import { HorizonsError } from './horizonsResponse';
import { parseHorizonsTable } from './horizonsTable';

/** The only network seam: the CLI passes a fetch-backed client, tests pass a fake. */
export interface HorizonsClient {
  fetchResultText(params: URLSearchParams): Promise<string>;
}

const FIXTURE_SOURCE = { api: HORIZONS_API_URL, settings: HORIZONS_FRAME_PARAMS };

// Loops await one body at a time on purpose: Horizons asks API users not to send parallel queries.
export async function generatePlanetFixtures(client: HorizonsClient): Promise<PlanetFixtures> {
  const planets: Partial<Record<PlanetName, PlanetFixture>> = {};
  for (const name of PLANET_NAMES) {
    const horizonsId = PLANET_HORIZONS_IDS[name];
    const states = await fetchStates(client, {
      command: horizonsId,
      jdTdbList: PLANET_SAMPLE_JD_TDB,
    });
    planets[name] = { horizonsId, states };
  }
  return planetFixturesSchema.parse({ source: FIXTURE_SOURCE, planets });
}

export async function generateAsteroidFixtures(client: HorizonsClient): Promise<AsteroidFixtures> {
  const asteroids: Partial<Record<AsteroidName, AsteroidFixture>> = {};
  for (const name of ASTEROID_NAMES) {
    asteroids[name] = await fetchAsteroid(client, ASTEROID_HORIZONS_COMMANDS[name]);
  }
  return asteroidFixturesSchema.parse({
    source: FIXTURE_SOURCE,
    epochJdTdb: ASTEROID_EPOCH_JD_TDB,
    asteroids,
  });
}

async function fetchAsteroid(
  client: HorizonsClient,
  horizonsCommand: string,
): Promise<AsteroidFixture> {
  const elements = await fetchElements(client, horizonsCommand);
  const states = await fetchStates(client, {
    command: horizonsCommand,
    jdTdbList: ASTEROID_SAMPLE_JD_TDB,
  });
  return { horizonsCommand, elements, states };
}

async function fetchStates(client: HorizonsClient, query: BodyQuery): Promise<StateRecord[]> {
  const text = await client.fetchResultText(buildVectorsQuery(query));
  const states = parseHorizonsTable(text).map(toStateRecord);
  assertCoversRequestedDates(query.jdTdbList, states);
  return states;
}

async function fetchElements(
  client: HorizonsClient,
  horizonsCommand: string,
): Promise<ElementsRecord> {
  const query = { command: horizonsCommand, jdTdbList: [ASTEROID_EPOCH_JD_TDB] };
  const rows = parseHorizonsTable(await client.fetchResultText(buildElementsQuery(query)));
  const [row] = rows;
  if (rows.length !== 1 || row === undefined) {
    throw new HorizonsError(`Expected one elements row, got ${rows.length}`);
  }
  const elements = toElementsRecord(row);
  if (elements.epochJdTdb !== ASTEROID_EPOCH_JD_TDB) {
    throw new HorizonsError(
      `Elements epoch ${elements.epochJdTdb} is not ${ASTEROID_EPOCH_JD_TDB}`,
    );
  }
  return elements;
}

/** Horizons returns rows in time order whatever the TLIST order, so compare against the sorted request. */
function assertCoversRequestedDates(
  requested: readonly number[],
  states: readonly StateRecord[],
): void {
  const expected = requested.toSorted((a, b) => a - b);
  const received = states.map((state) => state.jdTdb);
  if (
    received.length !== expected.length ||
    expected.some((jdTdb, index) => jdTdb !== received[index])
  ) {
    throw new HorizonsError(
      `Requested JDs ${expected.join(', ')} but received ${received.join(', ')}`,
    );
  }
}
