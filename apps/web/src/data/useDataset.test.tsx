import type { DatasetResponse } from '@perihelion/data';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogOf } from '../scene/swarm/swarmTestSupport';
import { type DatasetSources, type DatasetState, loadDatasetState, useDataset } from './useDataset';

const RESPONSE: DatasetResponse<'neos'> = {
  fetchedAt: '2026-09-30T12:00:00.000Z',
  data: catalogOf(),
  origin: 'snapshot',
};

describe('loadDatasetState', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is ready with the data and where it came from', async () => {
    await expect(loadDatasetState(() => Promise.resolve(RESPONSE))).resolves.toEqual({
      status: 'ready',
      data: RESPONSE.data,
      origin: 'snapshot',
      fetchedAt: RESPONSE.fetchedAt,
    });
  });

  it('is unavailable, without throwing, when the loader rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = () => Promise.reject(new Error('offline'));
    await expect(loadDatasetState(failing)).resolves.toEqual({ status: 'unavailable' });
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('useDataset', () => {
  it('loads once across re-renders, then reports ready', async () => {
    const load = vi.fn(() => Promise.resolve(RESPONSE));
    const sources: DatasetSources<'neos'> = { load, loadFromServer: vi.fn() };
    const states: DatasetState<'neos'>[] = [];
    function Probe({ label }: { label: string }) {
      states.push(useDataset('neos', sources));
      return <group name={label} />;
    }
    const renderer = await ReactThreeTestRenderer.create(<Probe label="first" />);
    await renderer.update(<Probe label="second" />);
    await ReactThreeTestRenderer.act(() => Promise.resolve());
    expect(load).toHaveBeenCalledTimes(1);
    expect(states[0]).toEqual({ status: 'loading' });
    expect(states.at(-1)).toMatchObject({ status: 'ready', data: RESPONSE.data });
    await renderer.unmount();
  });
});

const LIVE: DatasetResponse<'neos'> = {
  ...RESPONSE,
  origin: 'fresh',
  fetchedAt: '2026-10-03T00:00:00.000Z',
};

/** Mounts a probe and collects every state it renders; the caller drives the timers and unmounts. */
async function mountProbe(sources: DatasetSources<'neos'>) {
  const states: DatasetState<'neos'>[] = [];
  function Probe() {
    states.push(useDataset('neos', sources));
    return <group />;
  }
  const renderer = await ReactThreeTestRenderer.create(<Probe />);
  return { states, renderer };
}

/** No answer from the server twice, then the live response: the third retry is the one that lands. */
function serverAnswersOnThirdRetry() {
  let calls = 0;
  return vi.fn(async () => {
    calls += 1;
    if (calls < 3) throw new Error('asleep');
    return LIVE;
  });
}

const advance = (ms: number) =>
  ReactThreeTestRenderer.act(() => vi.advanceTimersByTimeAsync(ms).then(() => undefined));

describe('useDataset server retries', () => {
  afterEach(() => vi.useRealTimers());

  it('swaps the snapshot for the live response when the server answers on the third retry', async () => {
    vi.useFakeTimers();
    const loadFromServer = serverAnswersOnThirdRetry();
    const { states, renderer } = await mountProbe({ load: async () => RESPONSE, loadFromServer });
    await advance(0);
    expect(states.at(-1)).toMatchObject({ status: 'ready', origin: 'snapshot' });
    await advance(4_000 + 8_000 + 16_000);
    expect(loadFromServer).toHaveBeenCalledTimes(3);
    expect(states.at(-1)).toMatchObject({
      status: 'ready',
      origin: 'fresh',
      fetchedAt: LIVE.fetchedAt,
    });
    await advance(10 * 60_000);
    expect(loadFromServer).toHaveBeenCalledTimes(3);
    await renderer.unmount();
  });

  it('never retries data that came live from the server', async () => {
    vi.useFakeTimers();
    const loadFromServer = vi.fn(async () => LIVE);
    const { renderer } = await mountProbe({ load: async () => LIVE, loadFromServer });
    await advance(10 * 60_000);
    expect(loadFromServer).not.toHaveBeenCalled();
    await renderer.unmount();
  });

  it('stops retrying on unmount', async () => {
    vi.useFakeTimers();
    const loadFromServer = vi.fn(async () => Promise.reject(new Error('asleep')));
    const { renderer } = await mountProbe({ load: async () => RESPONSE, loadFromServer });
    await advance(4_000);
    await renderer.unmount();
    await advance(10 * 60_000);
    expect(loadFromServer).toHaveBeenCalledOnce();
  });
});
