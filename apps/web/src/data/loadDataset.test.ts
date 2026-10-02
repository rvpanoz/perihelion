import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatasetLoadError, SERVER_TIMEOUT_MS, loadDataset, loadFromServer } from './loadDataset';

const CME = {
  activityId: '2026-09-01T12:00:00-CME-001',
  startTime: '2026-09-01T12:00:00.000Z',
  sourceLocation: 'N12W30',
  note: null,
  link: null,
  analysis: {
    time21_5: '2026-09-01T18:30:00.000Z',
    latitudeDeg: -12,
    longitudeDeg: 30,
    halfAngleDeg: 25,
    speedKmPerS: 650,
    type: 'C',
    earthArrival: null,
    enlilRunCount: 0,
  },
};
const FETCHED_AT = '2026-09-28T12:00:00.000Z';

type Answer = (signal: AbortSignal | undefined) => Response | Promise<Response>;

/** A fake fetch that answers each path from a table and records what was asked. */
function fakeFetch(answers: Record<string, Answer>) {
  const paths: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const path = String(input);
    paths.push(path);
    const answer = answers[path];
    if (answer === undefined) throw new TypeError('Failed to fetch');
    return answer(init?.signal ?? undefined);
  };
  return { fetchImpl, paths };
}

const SERVER_BODY = { fetchedAt: FETCHED_AT, origin: 'fresh', data: [CME] };
const serverOk = () => Response.json(SERVER_BODY);
const snapshotOk = () => Response.json({ fetchedAt: '2026-09-01T00:00:00.000Z', data: [CME] });

describe('loadDataset', () => {
  it('uses the server when it answers', async () => {
    const { fetchImpl, paths } = fakeFetch({
      '/api/cmes': serverOk,
      '/snapshot/cmes.json': snapshotOk,
    });
    await expect(loadDataset('cmes', { fetchImpl })).resolves.toEqual({
      fetchedAt: FETCHED_AT,
      origin: 'fresh',
      data: [CME],
    });
    expect(paths).toEqual(['/api/cmes']);
  });

  it.each([
    ['is unreachable', undefined],
    ['answers 503', () => Response.json({ error: 'unavailable' }, { status: 503 })],
    ['answers something invalid', () => Response.json({ origin: 'fresh' })],
  ])('falls back to the bundled snapshot when the server %s', async (_case, server) => {
    const answers: Record<string, Answer> = { '/snapshot/cmes.json': snapshotOk };
    if (server !== undefined) answers['/api/cmes'] = server;
    const result = await loadDataset('cmes', fakeFetch(answers));
    expect(result).toMatchObject({ origin: 'snapshot', fetchedAt: '2026-09-01T00:00:00.000Z' });
  });

  it('fails clearly when neither the server nor the snapshot has data', async () => {
    await expect(loadDataset('cmes', fakeFetch({}))).rejects.toThrow(DatasetLoadError);
  });
});

/** A server that never sends its headers: only the caller's signal ends the wait. */
const neverAnswers: Answer = (signal) =>
  new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason));
  });

describe('loadDataset time limit', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gives up on a server that never answers and uses the snapshot after 4 s', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fake = fakeFetch({ '/api/cmes': neverAnswers, '/snapshot/cmes.json': snapshotOk });
    const result = loadDataset('cmes', fake);
    await vi.advanceTimersByTimeAsync(SERVER_TIMEOUT_MS - 1);
    expect(fake.paths).toEqual(['/api/cmes']);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toMatchObject({ origin: 'snapshot' });
  });

  it('limits only the wait for headers, so a slow body from a live server still arrives', async () => {
    vi.useFakeTimers();
    // Like a real fetch, aborting the request also fails a body still in flight.
    const slowBody: Answer = (signal) => {
      const body = new ReadableStream<Uint8Array>({
        start: (controller) => {
          signal?.addEventListener('abort', () => controller.error(signal.reason));
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(SERVER_BODY)));
            controller.close();
          }, 2 * SERVER_TIMEOUT_MS);
        },
      });
      return new Response(body, { headers: { 'content-type': 'application/json' } });
    };
    const result = loadDataset('cmes', fakeFetch({ '/api/cmes': slowBody }));
    await vi.advanceTimersByTimeAsync(2 * SERVER_TIMEOUT_MS);
    await expect(result).resolves.toMatchObject({ origin: 'fresh' });
  });
});

describe('loadFromServer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never falls back to the snapshot', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fake = fakeFetch({ '/snapshot/cmes.json': snapshotOk });
    await expect(loadFromServer('cmes', fake)).rejects.toThrow(DatasetLoadError);
    expect(fake.paths).toEqual(['/api/cmes']);
  });

  it('stops waiting when the caller aborts', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const caller = new AbortController();
    const result = loadFromServer('cmes', {
      ...fakeFetch({ '/api/cmes': neverAnswers }),
      signal: caller.signal,
    });
    caller.abort();
    await expect(result).rejects.toThrow(DatasetLoadError);
  });

  it('accepts a snapshot the server itself serves: the server answered', async () => {
    const serverSnapshot = () => Response.json({ ...SERVER_BODY, origin: 'snapshot' });
    await expect(
      loadFromServer('cmes', fakeFetch({ '/api/cmes': serverSnapshot })),
    ).resolves.toMatchObject({ origin: 'snapshot' });
  });
});
