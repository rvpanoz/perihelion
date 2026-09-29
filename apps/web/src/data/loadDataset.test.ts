import { describe, expect, it } from 'vitest';
import { DatasetLoadError, loadDataset } from './loadDataset';

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
  },
};
const FETCHED_AT = '2026-09-28T12:00:00.000Z';

/** A fake fetch that answers each path from a table and records what was asked. */
function fakeFetch(answers: Record<string, () => Response>) {
  const paths: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const path = String(input);
    paths.push(path);
    const answer = answers[path];
    if (answer === undefined) throw new TypeError('Failed to fetch');
    return answer();
  };
  return { fetchImpl, paths };
}

const serverOk = () => Response.json({ fetchedAt: FETCHED_AT, origin: 'fresh', data: [CME] });
const snapshotOk = () => Response.json({ fetchedAt: '2026-09-01T00:00:00.000Z', data: [CME] });

describe('loadDataset', () => {
  it('uses the server when it answers', async () => {
    const { fetchImpl, paths } = fakeFetch({
      '/api/cmes': serverOk,
      '/snapshot/cmes.json': snapshotOk,
    });
    await expect(loadDataset('cmes', fetchImpl)).resolves.toEqual({
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
    const answers: Record<string, () => Response> = { '/snapshot/cmes.json': snapshotOk };
    if (server !== undefined) answers['/api/cmes'] = server;
    const result = await loadDataset('cmes', fakeFetch(answers).fetchImpl);
    expect(result).toMatchObject({ origin: 'snapshot', fetchedAt: '2026-09-01T00:00:00.000Z' });
  });

  it('fails clearly when neither the server nor the snapshot has data', async () => {
    await expect(loadDataset('cmes', fakeFetch({}).fetchImpl)).rejects.toThrow(DatasetLoadError);
  });
});
