import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { timeStore } from '../time/timeStore';
import { J2000_JD_TDB, THREE_NEO_CATALOG } from '../scene/swarm/swarmTestSupport';
import { neoCatalogMessage } from './neoCatalogMessage';
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
