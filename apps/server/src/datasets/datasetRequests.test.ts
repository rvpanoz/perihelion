import {
  type CloseApproach,
  DATASET_DATA_SCHEMAS,
  type NeoCatalog,
  sbdbObjectResponseSchema,
  toApproachOrbit,
} from '@perihelion/data';
import {
  RECORDED_CAD_EMPTY,
  RECORDED_DONKI_CME_EMPTY,
  SBDB_NOT_FOUND_DESIGNATION,
} from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { FakeUpstream, RECORDED_BODIES } from '../testing/fakeUpstream.js';
import { RECORDED_CAD_DESIGNATIONS, neoCatalogOf } from '../testing/testCatalog.js';
import { TestClock } from '../testing/testClock.js';
import { TEST_NOW_MS } from '../testing/testConstants.js';
import {
  DATASET_TTL_MS,
  createDatasetRequests,
  defaultDatasetRequests,
} from './datasetRequests.js';

const FULL_CATALOG = neoCatalogOf(RECORDED_CAD_DESIGNATIONS);

function requestsWith(upstream = new FakeUpstream(), catalog: NeoCatalog = FULL_CATALOG) {
  const clock = new TestClock(TEST_NOW_MS);
  const warnings: string[] = [];
  return {
    upstream,
    warnings,
    requests: createDatasetRequests({
      jpl: upstream,
      donki: upstream,
      clock,
      readNeoCatalog: () => Promise.resolve(catalog),
      logger: { warn: (_details, message) => void warnings.push(message) },
    }),
  };
}

function lookupRequests(upstream: FakeUpstream): (string | null)[] {
  return upstream.requests
    .filter((url) => url.pathname === '/sbdb.api')
    .map((url) => url.searchParams.get('des'));
}

async function closeApproaches(setup: ReturnType<typeof requestsWith>): Promise<CloseApproach[]> {
  return DATASET_DATA_SCHEMAS['close-approaches'].parse(
    await setup.requests.closeApproaches(7).fetchData(),
  );
}

describe('createDatasetRequests', () => {
  it('keys each query by name and window, with its TTL', () => {
    const { requests } = requestsWith();
    expect(requests.neos()).toMatchObject({
      cacheKey: 'neos',
      ttlMs: DATASET_TTL_MS.neos,
      snapshotName: 'neos',
    });
    expect(requests.closeApproaches(3).cacheKey).toBe('close-approaches?days=3');
    expect(requests.cmes(30)).toMatchObject({ cacheKey: 'cmes?days=30', snapshotName: 'cmes' });
  });

  it('asks CAD for today ± days and DONKI for the last days, with no key', async () => {
    const { upstream, requests } = requestsWith();
    await requests.closeApproaches(7).fetchData();
    await requests.cmes(30).fetchData();
    const [cad, donki] = upstream.requests;
    expect([cad?.searchParams.get('date-min'), cad?.searchParams.get('date-max')]).toEqual([
      '2026-09-21',
      '2026-10-05',
    ]);
    expect([donki?.searchParams.get('startDate'), donki?.searchParams.get('endDate')]).toEqual([
      '2026-08-29',
      '2026-09-28',
    ]);
    expect(donki?.pathname).toBe('/DONKI-API/get/CME');
    expect(donki?.searchParams.has('api_key')).toBe(false);
  });

  it('rejects an upstream body that fails validation, so it never reaches the cache', async () => {
    const { requests } = requestsWith(new FakeUpstream({ '/cad.api': { unexpected: true } }));
    await expect(requests.closeApproaches(7).fetchData()).rejects.toThrow();
  });

  it('serves empty upstream windows as empty lists', async () => {
    const { requests } = requestsWith(
      new FakeUpstream({
        '/cad.api': RECORDED_CAD_EMPTY,
        '/DONKI-API/get/CME': RECORDED_DONKI_CME_EMPTY,
      }),
    );
    await expect(requests.closeApproaches(7).fetchData()).resolves.toEqual([]);
    await expect(requests.cmes(30).fetchData()).resolves.toEqual([]);
  });
});

describe('close approaches with orbits', () => {
  const [first = '', ...rest] = RECORDED_CAD_DESIGNATIONS;

  it('needs no lookup when the catalog has every recorded row', async () => {
    const setup = requestsWith();
    const rows = await closeApproaches(setup);
    expect(lookupRequests(setup.upstream)).toEqual([]);
    expect(rows).toHaveLength(RECORDED_CAD_DESIGNATIONS.length);
    for (const row of rows) expect(row.orbit.semiMajorAxisAu).toBeGreaterThan(0);
  });

  it('looks up the row the catalog lacks, once, and serves its recorded orbit', async () => {
    const setup = requestsWith(new FakeUpstream(), neoCatalogOf(rest));
    const rows = await closeApproaches(setup);
    expect(lookupRequests(setup.upstream)).toEqual([first]);
    const recorded = sbdbObjectResponseSchema.parse(RECORDED_BODIES[`/sbdb.api?des=${first}`]);
    expect(rows.find((row) => row.designation === first)?.orbit).toEqual(toApproachOrbit(recorded));
  });

  it('drops a row SBDB does not know, with a warning, and serves the rest', async () => {
    const notFound = RECORDED_BODIES[`/sbdb.api?des=${SBDB_NOT_FOUND_DESIGNATION}`];
    const upstream = new FakeUpstream({ ...RECORDED_BODIES, [`/sbdb.api?des=${first}`]: notFound });
    const setup = requestsWith(upstream, neoCatalogOf(rest));
    const rows = await closeApproaches(setup);
    expect(rows.map((row) => row.designation)).toEqual(rest);
    expect(setup.warnings).toHaveLength(1);
  });

  it('fails the refresh when a lookup cannot reach SBDB', async () => {
    const upstream = new FakeUpstream({ '/cad.api': RECORDED_BODIES['/cad.api'] });
    const setup = requestsWith(upstream, neoCatalogOf(rest));
    await expect(setup.requests.closeApproaches(7).fetchData()).rejects.toThrow();
  });
});

describe('defaultDatasetRequests', () => {
  it('covers every dataset with its default window', () => {
    const defaults = defaultDatasetRequests(requestsWith().requests);
    expect(Object.values(defaults).map((request) => request.cacheKey)).toEqual([
      'neos',
      'close-approaches?days=7',
      'cmes?days=30',
    ]);
  });
});
