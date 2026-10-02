import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { timeStore } from '../time/timeStore';
import { J2000_JD_TDB, THREE_NEO_CATALOG } from '../scene/swarm/swarmTestSupport';
import { type NeoCatalogRequest, neoCatalogMessage } from './neoCatalogMessage';
import type { NeoCatalogSource } from './neoCatalogSource';
import { type NeoCatalogState, useNeoCatalog } from './useNeoCatalog';

const READY = neoCatalogMessage(
  { fetchedAt: '2026-09-30T12:00:00.000Z', data: THREE_NEO_CATALOG, origin: 'snapshot' },
  J2000_JD_TDB,
).message;

async function statesFrom(source: NeoCatalogSource): Promise<NeoCatalogState[]> {
  const states: NeoCatalogState[] = [];
  function Probe() {
    states.push(useNeoCatalog(source));
    return <group />;
  }
  const renderer = await ReactThreeTestRenderer.create(<Probe />);
  await ReactThreeTestRenderer.act(() => Promise.resolve());
  await renderer.unmount();
  return states;
}

describe('useNeoCatalog', () => {
  it('reports the catalog once its source delivers it', async () => {
    const source: NeoCatalogSource = (_request, deliver) => {
      queueMicrotask(() => deliver(READY));
      return () => undefined;
    };
    const states = await statesFrom(source);
    expect(states[0]).toEqual({ status: 'loading' });
    expect(states.at(-1)).toMatchObject({ status: 'ready', origin: 'snapshot', count: 3 });
  });

  it('reports the catalog unavailable when its source says so', async () => {
    const source: NeoCatalogSource = (_request, deliver) => {
      queueMicrotask(() => deliver({ kind: 'unavailable' }));
      return () => undefined;
    };
    expect((await statesFrom(source)).at(-1)).toEqual({ status: 'unavailable' });
  });

  it('asks at the current simulation time and stops the load on unmount', async () => {
    timeStore.scrubTo(J2000_JD_TDB + 5);
    const stop = vi.fn();
    const source = vi.fn<NeoCatalogSource>(() => stop);
    await statesFrom(source);
    expect(source).toHaveBeenCalledWith({ referenceJdTdb: J2000_JD_TDB + 5 }, expect.any(Function));
    expect(stop).toHaveBeenCalled();
  });
});

const LIVE = neoCatalogMessage(
  { fetchedAt: '2026-10-03T00:00:00.000Z', data: THREE_NEO_CATALOG, origin: 'fresh' },
  J2000_JD_TDB,
).message;

/** The first load gives the snapshot; server-only retries get no answer twice, then the live catalog. */
function snapshotThenLiveOnThirdRetry() {
  const serverRequests: NeoCatalogRequest[] = [];
  const stops = vi.fn();
  const source: NeoCatalogSource = (request, deliver) => {
    if (request.serverOnly === true) serverRequests.push(request);
    const answer =
      request.serverOnly !== true ? READY : serverRequests.length < 3 ? undefined : LIVE;
    queueMicrotask(() => deliver(answer ?? { kind: 'unavailable' }));
    return stops;
  };
  return { source, serverRequests, stops };
}

describe('useNeoCatalog server retries', () => {
  afterEach(() => vi.useRealTimers());

  it('swaps the snapshot swarm for the live one when the server answers on the third retry', async () => {
    vi.useFakeTimers();
    const { source, serverRequests, stops } = snapshotThenLiveOnThirdRetry();
    const states: NeoCatalogState[] = [];
    function Probe() {
      states.push(useNeoCatalog(source));
      return <group />;
    }
    const renderer = await ReactThreeTestRenderer.create(<Probe />);
    const advance = (ms: number) =>
      ReactThreeTestRenderer.act(() => vi.advanceTimersByTimeAsync(ms).then(() => undefined));
    await advance(4_000 + 8_000);
    expect(states.at(-1)).toMatchObject({ status: 'ready', origin: 'snapshot' });
    await advance(16_000);
    expect(serverRequests).toHaveLength(3);
    expect(states.at(-1)).toMatchObject({ status: 'ready', origin: 'fresh' });
    expect(stops).toHaveBeenCalledTimes(3);
    await advance(10 * 60_000);
    expect(serverRequests).toHaveLength(3);
    await renderer.unmount();
  });
});
