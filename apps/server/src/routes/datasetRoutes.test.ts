import { datasetResponseSchema } from '@perihelion/data';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { snapshotsOf } from '../testing/fakeSnapshots.js';
import { FakeUpstream } from '../testing/fakeUpstream.js';
import { type TestServer, createTestServer } from '../testing/testServer.js';

const DAY_MS = 86_400_000;
let server: TestServer | undefined;

async function start(options?: Parameters<typeof createTestServer>[0]): Promise<TestServer> {
  server = await createTestServer(options);
  return server;
}

const get = (url: string) => {
  if (server === undefined) throw new Error('start() first');
  return server.app.inject({ method: 'GET', url });
};

afterEach(async () => {
  await server?.app.close();
  server = undefined;
});

describe('GET /api/neos', () => {
  it('serves the recorded SBDB sample as a validated columnar catalog', async () => {
    await start();
    const response = await get('/api/neos');
    expect(response.statusCode).toBe(200);
    const body = datasetResponseSchema('neos').parse(response.json());
    expect(body).toMatchObject({ origin: 'fresh', fetchedAt: '2026-09-28T12:00:00.000Z' });
    expect(body.data.count).toBeGreaterThan(0);
  });

  it('answers a repeat from the cache, then serves stale and refreshes once a day has passed', async () => {
    const { upstream, clock } = await start();
    await get('/api/neos');
    expect((await get('/api/neos')).json()).toMatchObject({ origin: 'fresh' });
    expect(upstream.requests).toHaveLength(1);
    clock.advance(DAY_MS);
    expect((await get('/api/neos')).json()).toMatchObject({ origin: 'stale' });
    await vi.waitFor(() => expect(upstream.requests).toHaveLength(2));
  });
});

describe('GET /api/close-approaches', () => {
  it('serves validated approaches for today ± 7 days by default', async () => {
    const { upstream } = await start();
    const response = await get('/api/close-approaches');
    expect(response.statusCode).toBe(200);
    datasetResponseSchema('close-approaches').parse(response.json());
    expect(upstream.requests[0]?.searchParams.get('date-min')).toBe('2026-09-21');
  });

  it('honours ?days=3', async () => {
    const { upstream } = await start();
    await get('/api/close-approaches?days=3');
    expect(upstream.requests[0]?.searchParams.get('date-max')).toBe('2026-10-01');
  });

  it.each(['0', '61', '2.5', 'abc', '', '1&days=2'])(
    'rejects days=%s with 400 without calling upstream',
    async (days) => {
      const { upstream } = await start();
      const response = await get(`/api/close-approaches?days=${days}`);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'days must be a whole number from 1 to 60' });
      expect(upstream.requests).toHaveLength(0);
    },
  );
});

describe('GET /api/cmes', () => {
  it('serves validated CMEs for the last 30 days by default', async () => {
    const { upstream } = await start();
    const response = await get('/api/cmes');
    expect(response.statusCode).toBe(200);
    expect(datasetResponseSchema('cmes').parse(response.json()).data.length).toBeGreaterThan(0);
    expect(upstream.requests[0]?.searchParams.get('startDate')).toBe('2026-08-29');
  });
});

describe('when upstream is down', () => {
  const offline = () => Object.assign(new FakeUpstream(), { offline: true });
  const SNAPSHOT = { dataJson: '[]', fetchedAtMs: Date.UTC(2026, 8, 1) };

  it('serves the snapshot, marked as such', async () => {
    await start({ upstream: offline(), snapshots: snapshotsOf({ cmes: SNAPSHOT }) });
    const response = await get('/api/cmes');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      fetchedAt: '2026-09-01T00:00:00.000Z',
      origin: 'snapshot',
      data: [],
    });
  });

  it('answers 503 when there is no snapshot either', async () => {
    await start({ upstream: offline() });
    const response = await get('/api/cmes');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: expect.stringContaining('unavailable') });
  });

  it('keeps serving what it cached before the network went down', async () => {
    const { upstream, clock } = await start();
    await get('/api/cmes');
    upstream.offline = true;
    clock.advance(DAY_MS);
    expect((await get('/api/cmes')).json()).toMatchObject({ origin: 'stale' });
  });
});
