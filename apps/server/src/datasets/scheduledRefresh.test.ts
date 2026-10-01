import { afterEach, describe, expect, it, vi } from 'vitest';
import { startScheduledRefresh } from './scheduledRefresh.js';
import type { DatasetRequest } from './types.js';

const request = (cacheKey: string): DatasetRequest => ({
  cacheKey,
  ttlMs: 1,
  snapshotName: 'neos',
  fetchData: async () => [],
  accepts: () => true,
});

afterEach(() => vi.useRealTimers());

describe('startScheduledRefresh', () => {
  it('refreshes every dataset at start and on each interval until stopped', async () => {
    vi.useFakeTimers();
    const refreshed: string[] = [];
    const service = {
      refreshIfStale: async (r: DatasetRequest) => void refreshed.push(r.cacheKey),
    };
    const stop = startScheduledRefresh({
      service,
      requests: () => [request('a'), request('b')],
      intervalMs: 1_000,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshed).toEqual(['a', 'b']);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refreshed).toEqual(['a', 'b', 'a', 'b']);
    stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refreshed).toHaveLength(4);
  });
});
