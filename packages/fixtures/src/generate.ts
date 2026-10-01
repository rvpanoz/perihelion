import {
  type AsteroidFixture,
  type AsteroidFixtures,
  type AsteroidProvenance,
  type ElementsRecord,
  type FixtureSource,
  type PlanetFixture,
  type PlanetFixtures,
  type StateRecord,
  type SunOrientationFixtures,
  type SunSample,
  asteroidFixturesSchema,
  planetFixturesSchema,
  sunOrientationFixturesSchema,
} from './fixtureSchema';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_HORIZONS_COMMANDS,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  type AsteroidName,
  EARTH_HORIZONS_ID,
  PLANET_HORIZONS_IDS,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
  type PlanetName,
  SUN_SAMPLE_JD_TDB,
} from './fixtureSpec';
import {
  type BodyQuery,
  HORIZONS_API_URL,
  HORIZONS_FRAME_PARAMS,
  SUN_OBSERVER_PARAMS,
  buildElementsQuery,
  buildSunObserverQuery,
  buildVectorsQuery,
} from './horizonsQuery';
import {
  type HeaderProvenance,
  readElementsProvenance,
  readHeaderProvenance,
} from './horizonsProvenance';
import {
  type SunObserverRecord,
  toElementsRecord,
  toStateRecord,
  toSunObserverRecord,
} from './horizonsRecords';
import { HorizonsError, type HorizonsResponse } from './horizonsResponse';
import { parseHorizonsTable } from './horizonsTable';

/** The only network seam: the CLI passes a fetch-backed client, tests pass a fake. */
export interface HorizonsClient {
  fetchResponse(params: URLSearchParams): Promise<HorizonsResponse>;
}

type ResponseProvenance = Pick<FixtureSource, 'apiVersion' | 'generatedAt'>;

interface FetchedResult {
  resultText: string;
  header: HeaderProvenance;
}

/**
 * Keeps each response's provenance for the fixture file, and rejects a run that straddles an
 * API version change rather than silently mixing the two.
 */
class ProvenanceRecordingClient {
  readonly #client: HorizonsClient;
  readonly #responses: ResponseProvenance[] = [];

  constructor(client: HorizonsClient) {
    this.#client = client;
  }

  async fetch(params: URLSearchParams): Promise<FetchedResult> {
    const { resultText, apiVersion } = await this.#client.fetchResponse(params);
    const header = readHeaderProvenance(resultText);
    this.#responses.push({ apiVersion, generatedAt: header.generatedAt });
    return { resultText, header };
  }

  /** The first response's timestamp stands for the run; the rest must agree on what they used. */
  source(): FixtureSource {
    const [first] = this.#responses;
    if (first === undefined)
      throw new HorizonsError('No Horizons responses to take provenance from');
    assertOneApiVersion(this.#responses, first);
    return { api: HORIZONS_API_URL, ...first, settings: HORIZONS_FRAME_PARAMS };
  }
}

// Loops await one body at a time on purpose: Horizons asks API users not to send parallel queries.
export async function generatePlanetFixtures(client: HorizonsClient): Promise<PlanetFixtures> {
  const recorder = new ProvenanceRecordingClient(client);
  const planets: Partial<Record<PlanetName, PlanetFixture>> = {};
  const ephemerides: string[] = [];
  for (const name of PLANET_NAMES) {
    const horizonsId = PLANET_HORIZONS_IDS[name];
    const { states, header } = await fetchStates(recorder, {
      command: horizonsId,
      jdTdbList: PLANET_SAMPLE_JD_TDB,
    });
    planets[name] = { horizonsId, states };
    ephemerides.push(header.ephemeris);
  }
  const ephemeris = commonEphemeris(ephemerides);
  return planetFixturesSchema.parse({ source: recorder.source(), ephemeris, planets });
}

export async function generateAsteroidFixtures(client: HorizonsClient): Promise<AsteroidFixtures> {
  const recorder = new ProvenanceRecordingClient(client);
  const asteroids: Partial<Record<AsteroidName, AsteroidFixture>> = {};
  for (const name of ASTEROID_NAMES) {
    asteroids[name] = await fetchAsteroid(recorder, ASTEROID_HORIZONS_COMMANDS[name]);
  }
  return asteroidFixturesSchema.parse({
    source: recorder.source(),
    epochJdTdb: ASTEROID_EPOCH_JD_TDB,
    asteroids,
  });
}

/** Earth's states and B0 on the same dates; together with the IAU Sun pole they fix the HEEQ frame. */
export async function generateSunOrientationFixtures(
  client: HorizonsClient,
): Promise<SunOrientationFixtures> {
  const recorder = new ProvenanceRecordingClient(client);
  const earth = await fetchStates(recorder, {
    command: EARTH_HORIZONS_ID,
    jdTdbList: SUN_SAMPLE_JD_TDB,
  });
  const observer = await fetchSunObserver(recorder, SUN_SAMPLE_JD_TDB);
  return sunOrientationFixturesSchema.parse({
    source: recorder.source(),
    observerSettings: SUN_OBSERVER_PARAMS,
    ephemeris: commonEphemeris([earth.header.ephemeris, observer.header.ephemeris]),
    samples: earth.states.map((state, index) => toSunSample(state, observer.records[index])),
  });
}

async function fetchSunObserver(
  recorder: ProvenanceRecordingClient,
  jdTtList: readonly number[],
): Promise<{ records: SunObserverRecord[]; header: HeaderProvenance }> {
  const { resultText, header } = await recorder.fetch(buildSunObserverQuery(jdTtList));
  const records = parseHorizonsTable(resultText).map(toSunObserverRecord);
  assertCoversRequestedDates(
    jdTtList,
    records.map((record) => record.jdTt),
  );
  return { records, header };
}

/** Both tables cover exactly the requested dates in time order, so rows pair up by index (TT = TDB here). */
function toSunSample(state: StateRecord, record: SunObserverRecord | undefined): SunSample {
  if (record === undefined || record.jdTt !== state.jdTdb) {
    throw new HorizonsError(`No B0 for JD ${state.jdTdb}`);
  }
  return {
    jdTdb: state.jdTdb,
    earthPositionAu: state.positionAu,
    earthHeliographicLatitudeDeg: record.earthHeliographicLatitudeDeg,
  };
}

async function fetchAsteroid(
  recorder: ProvenanceRecordingClient,
  horizonsCommand: string,
): Promise<AsteroidFixture> {
  const { elements, provenance } = await fetchElements(recorder, horizonsCommand);
  const { states, header } = await fetchStates(recorder, {
    command: horizonsCommand,
    jdTdbList: ASTEROID_SAMPLE_JD_TDB,
  });
  assertSameOrbitSolution(provenance.orbitSolution, header.targetSource);
  return { horizonsCommand, provenance, elements, states };
}

async function fetchStates(
  recorder: ProvenanceRecordingClient,
  query: BodyQuery,
): Promise<{ states: StateRecord[]; header: HeaderProvenance }> {
  const { resultText, header } = await recorder.fetch(buildVectorsQuery(query));
  const states = parseHorizonsTable(resultText).map(toStateRecord);
  assertCoversRequestedDates(
    query.jdTdbList,
    states.map((state) => state.jdTdb),
  );
  return { states, header };
}

async function fetchElements(
  recorder: ProvenanceRecordingClient,
  horizonsCommand: string,
): Promise<{ elements: ElementsRecord; provenance: AsteroidProvenance }> {
  const query = { command: horizonsCommand, jdTdbList: [ASTEROID_EPOCH_JD_TDB] };
  const { resultText, header } = await recorder.fetch(buildElementsQuery(query));
  const elements = toEpochElements(parseHorizonsTable(resultText));
  const provenance = {
    orbitSolution: header.targetSource,
    ephemeris: header.ephemeris,
    ...readElementsProvenance(resultText),
  };
  return { elements, provenance };
}

function toEpochElements(rows: ReturnType<typeof parseHorizonsTable>): ElementsRecord {
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

function assertOneApiVersion(
  responses: readonly ResponseProvenance[],
  first: ResponseProvenance,
): void {
  const changed = responses.find(({ apiVersion }) => apiVersion !== first.apiVersion);
  if (changed !== undefined) {
    throw new HorizonsError(
      `Horizons API version changed mid-run: ${first.apiVersion} then ${changed.apiVersion}`,
    );
  }
}

/** A golden test compares against one planetary ephemeris, so every response in a set must share it. */
function commonEphemeris(ephemerides: readonly string[]): string {
  const [first] = ephemerides;
  if (first === undefined || ephemerides.some((ephemeris) => ephemeris !== first)) {
    const found = [...new Set(ephemerides)].join(', ');
    throw new HorizonsError(`Responses came from mixed ephemerides: ${found}`);
  }
  return first;
}

/** Elements and states must come from one orbit fit, or a golden test would compare two orbits. */
function assertSameOrbitSolution(elementsSolution: string, statesSolution: string): void {
  if (elementsSolution !== statesSolution) {
    throw new HorizonsError(
      `Elements use orbit solution ${elementsSolution} but states use ${statesSolution}`,
    );
  }
}

/** Horizons returns rows in time order whatever the TLIST order, so compare against the sorted request. */
function assertCoversRequestedDates(
  requested: readonly number[],
  received: readonly number[],
): void {
  const expected = requested.toSorted((a, b) => a - b);
  if (
    received.length !== expected.length ||
    expected.some((jdTdb, index) => jdTdb !== received[index])
  ) {
    throw new HorizonsError(
      `Requested JDs ${expected.join(', ')} but received ${received.join(', ')}`,
    );
  }
}
