import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { DatasetUnavailableError } from '../errors.js';
import { NO_SNAPSHOTS, snapshotsOf } from '../testing/fakeSnapshots.js';
import { TestClock } from '../testing/testClock.js';
import { UpstreamError } from '../upstream/httpClient.js';
import { DatasetService, FAILURE_BACKOFF_MS } from './datasetService.js';
import { SqliteDatasetCache } from './sqliteDatasetCache.js';
import type { DatasetCache, DatasetRequest, SnapshotReader } from './types.js';

const HOUR_MS = 3_600_000;
const SNAPSHOT = { dataJson: '["snapshot"]', fetchedAtMs: Date.UTC(2026, 8, 1) };

const BROKEN_CACHE: DatasetCache = {
  read: () => {
    throw new TypeError('Corrupt cache row for cmes?days=30');
  },
  write: () => undefined,
};

function setup(
  snapshots: SnapshotReader = NO_SNAPSHOTS,
  cache: DatasetCache = new SqliteDatasetCache(new DatabaseSync(':memory:')),
) {
  const clock = new TestClock(Date.UTC(2026, 8, 28, 12));
  const warnings: string[] = [];
  const logger = { warn: (_details: object, message: string) => void warnings.push(message) };
  return {
    service: new DatasetService({ cache, snapshots, clock, logger }),
    cache,
    clock,
    warnings,
  };
}

/** A request whose upstream answers with the call number, so tests can tell fetches apart. */
function countingRequest(fetchData?: () => Promise<unknown>) {
  let calls = 0;
  const request: DatasetRequest = {
    cacheKey: 'cmes?days=30',
    ttlMs: HOUR_MS,
    snapshotName: 'cmes',
    fetchData: async () => {
      calls += 1;
      return fetchData === undefined ? [calls] : fetchData();
    },
  };
  return { request, calls: () => calls };
}

const offline = () => Promise.reject(new UpstreamError('network is off'));

describe('DatasetService.read', () => {
  it('fetches on a cold cache, stores the result and serves it fresh', async () => {
    const { service, cache } = setup();
    const { request } = countingRequest();
    await expect(service.read(request)).resolves.toMatchObject({
      dataJson: '[1]',
      origin: 'fresh',
    });
    expect(cache.read(request.cacheKey)?.dataJson).toBe('[1]');
  });

  it('serves a fresh cached copy without calling upstream', async () => {
    const { service } = setup();
    const { request, calls } = countingRequest();
    await service.read(request);
    await expect(service.read(request)).resolves.toMatchObject({ origin: 'fresh' });
    expect(calls()).toBe(1);
  });

  it('serves a stale copy at once and refreshes it in the background', async () => {
    const { service, cache, clock } = setup();
    const { request } = countingRequest();
    await service.read(request);
    clock.advance(HOUR_MS);
    await expect(service.read(request)).resolves.toMatchObject({
      dataJson: '[1]',
      origin: 'stale',
    });
    await vi.waitFor(() => expect(cache.read(request.cacheKey)?.dataJson).toBe('[2]'));
  });

  it('shares one upstream request between concurrent cold reads', async () => {
    const { service } = setup();
    const { request, calls } = countingRequest();
    const [first, second] = await Promise.all([service.read(request), service.read(request)]);
    expect(calls()).toBe(1);
    expect(second).toEqual(first);
  });

  it('falls back to the snapshot when upstream fails on a cold cache, and says why', async () => {
    const { service, warnings } = setup(snapshotsOf({ cmes: SNAPSHOT }));
    await expect(service.read(countingRequest(offline).request)).resolves.toEqual({
      ...SNAPSHOT,
      origin: 'snapshot',
    });
    expect(warnings).toEqual(['Dataset refresh failed']);
  });

  it('answers unavailable when upstream fails and there is no snapshot', async () => {
    const { service } = setup();
    await expect(service.read(countingRequest(offline).request)).rejects.toThrow(
      DatasetUnavailableError,
    );
  });

  it('does not retry a failed upstream on every request, only after the back-off', async () => {
    const { service, clock } = setup(snapshotsOf({ cmes: SNAPSHOT }));
    const { request, calls } = countingRequest(offline);
    await service.read(request);
    await service.read(request);
    expect(calls()).toBe(1);
    clock.advance(FAILURE_BACKOFF_MS);
    await service.read(request);
    expect(calls()).toBe(2);
  });

  it('keeps serving the stale copy when the background refresh fails', async () => {
    const { service, clock, warnings } = setup();
    let failing = false;
    const { request } = countingRequest(async () => (failing ? offline() : ['cached']));
    await service.read(request);
    failing = true;
    clock.advance(HOUR_MS);
    await expect(service.read(request)).resolves.toMatchObject({
      dataJson: '["cached"]',
      origin: 'stale',
    });
    await vi.waitFor(() => expect(warnings).toEqual(['Dataset refresh failed']));
  });

  it('does not retry a failed background refresh on every stale read, only after the back-off', async () => {
    const { service, clock, warnings } = setup();
    let failing = false;
    const { request, calls } = countingRequest(async () => (failing ? offline() : ['cached']));
    await service.read(request);
    failing = true;
    clock.advance(HOUR_MS);
    await service.read(request);
    await vi.waitFor(() => expect(warnings).toHaveLength(1));
    await expect(service.read(request)).resolves.toMatchObject({ origin: 'stale' });
    expect(calls()).toBe(2);
    clock.advance(FAILURE_BACKOFF_MS);
    await service.read(request);
    expect(calls()).toBe(3);
  });
});

describe('DatasetService.refreshIfStale', () => {
  it('skips a fresh copy, refreshes a stale one, and never rejects', async () => {
    const { service, clock } = setup();
    const { request, calls } = countingRequest();
    await service.refreshIfStale(request);
    await service.refreshIfStale(request);
    expect(calls()).toBe(1);
    clock.advance(HOUR_MS);
    await service.refreshIfStale(request);
    expect(calls()).toBe(2);
    // A cold cache of its own, so the failing upstream is actually called.
    await expect(
      setup().service.refreshIfStale(countingRequest(offline).request),
    ).resolves.toBeUndefined();
  });

  it('logs instead of rejecting when the cache itself fails, so the scheduler cannot crash', async () => {
    const { service, warnings } = setup(NO_SNAPSHOTS, BROKEN_CACHE);
    await expect(service.refreshIfStale(countingRequest().request)).resolves.toBeUndefined();
    expect(warnings).toEqual(['Dataset refresh failed']);
  });
});
