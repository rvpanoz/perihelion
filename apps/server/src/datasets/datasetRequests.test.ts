import { RECORDED_CAD_EMPTY, RECORDED_DONKI_CME_EMPTY } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { FakeUpstream } from '../testing/fakeUpstream.js';
import { TestClock } from '../testing/testClock.js';
import { TEST_API_KEY, TEST_NOW_MS } from '../testing/testConstants.js';
import {
  DATASET_TTL_MS,
  createDatasetRequests,
  defaultDatasetRequests,
} from './datasetRequests.js';

function requestsWith(upstream = new FakeUpstream()) {
  const clock = new TestClock(TEST_NOW_MS);
  return {
    upstream,
    requests: createDatasetRequests({
      jpl: upstream,
      donki: upstream,
      clock,
      nasaApiKey: TEST_API_KEY,
    }),
  };
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

  it('asks CAD for today ± days and DONKI for the last days, with the key', async () => {
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
    expect(donki?.searchParams.get('api_key')).toBe(TEST_API_KEY);
  });

  it('rejects an upstream body that fails validation, so it never reaches the cache', async () => {
    const { requests } = requestsWith(new FakeUpstream({ '/cad.api': { unexpected: true } }));
    await expect(requests.closeApproaches(7).fetchData()).rejects.toThrow();
  });

  it('serves empty upstream windows as empty lists', async () => {
    const { requests } = requestsWith(
      new FakeUpstream({ '/cad.api': RECORDED_CAD_EMPTY, '/DONKI/CME': RECORDED_DONKI_CME_EMPTY }),
    );
    await expect(requests.closeApproaches(7).fetchData()).resolves.toEqual([]);
    await expect(requests.cmes(30).fetchData()).resolves.toEqual([]);
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
