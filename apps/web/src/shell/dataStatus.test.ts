import type { DatasetName, DatasetOrigin } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import type { DatasetState } from '../data/useDataset';
import { type NamedDatasetState, dataStatus } from './dataStatus';

const NOW_MS = Date.parse('2026-10-01T12:00:00.000Z');
const MINUTE_MS = 60_000;

function ready(origin: DatasetOrigin, minutesAgo: number): DatasetState<DatasetName> {
  const fetchedAt = new Date(NOW_MS - minutesAgo * MINUTE_MS).toISOString();
  return { status: 'ready', data: [], origin, fetchedAt };
}

function neos(state: DatasetState<DatasetName>): NamedDatasetState {
  return { label: 'NEO catalog', state, summary: '40,123 asteroids' };
}

function approaches(state: DatasetState<DatasetName>): NamedDatasetState {
  return { label: 'Close approaches', state };
}

function statusOf(...datasets: NamedDatasetState[]) {
  return dataStatus({ datasets, nowMs: NOW_MS });
}

describe('dataStatus', () => {
  it('is live, aged by the oldest dataset, when all are fresh', () => {
    const status = statusOf(neos(ready('fresh', 4)), approaches(ready('fresh', 12)));
    expect(status.tone).toBe('live');
    expect(status.text).toBe('Live · JPL · updated 12 min ago');
  });

  it('says the data is cached while one dataset is stale', () => {
    const status = statusOf(neos(ready('fresh', 4)), approaches(ready('stale', 180)));
    expect(status.tone).toBe('stale');
    expect(status.text).toBe('Cached · JPL · updated 3 h ago');
  });

  it('gives the snapshot date when one dataset is the bundled snapshot', () => {
    const snapshot: DatasetState<DatasetName> = {
      status: 'ready',
      data: [],
      origin: 'snapshot',
      fetchedAt: '2026-09-28T10:00:00.000Z',
    };
    const status = statusOf(neos(snapshot), approaches(ready('stale', 30)));
    expect(status.tone).toBe('snapshot');
    expect(status.text).toBe('Offline snapshot · JPL · from 28 Sep 2026');
  });

  it('names the dataset that is unavailable', () => {
    const status = statusOf(neos(ready('snapshot', 10)), approaches({ status: 'unavailable' }));
    expect(status.tone).toBe('unavailable');
    expect(status.text).toBe('Close approaches unavailable');
  });

  it('is loading while any dataset loads and none is worse', () => {
    const status = statusOf(neos(ready('fresh', 1)), approaches({ status: 'loading' }));
    expect(status.tone).toBe('loading');
    expect(status.text).toBe('Loading JPL data…');
  });

  it('says just now for data fetched under a minute ago', () => {
    expect(statusOf(neos(ready('fresh', 0.5))).text).toBe('Live · JPL · updated just now');
  });

  it('gives one detail line per dataset, with its age', () => {
    const status = statusOf(neos(ready('fresh', 4)), approaches({ status: 'loading' }));
    expect(status.details).toEqual([
      'NEO catalog: 40,123 asteroids · fetched 4 min ago',
      'Close approaches: loading',
    ]);
  });

  it('says how each ready dataset was served in its detail line', () => {
    const status = statusOf(neos(ready('stale', 120)), approaches(ready('snapshot', 3 * 24 * 60)), {
      label: 'CMEs',
      state: { status: 'unavailable' },
    });
    expect(status.details).toEqual([
      'NEO catalog: 40,123 asteroids · cached, fetched 2 h ago',
      'Close approaches: snapshot from 28 Sep 2026',
      'CMEs: unavailable',
    ]);
  });
});
