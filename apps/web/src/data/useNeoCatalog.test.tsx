import type { DatasetResponse } from '@perihelion/data';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogOf } from '../scene/swarm/swarmTestSupport';
import { type NeoCatalogState, loadNeoCatalog, useNeoCatalog } from './useNeoCatalog';

const RESPONSE: DatasetResponse<'neos'> = {
  fetchedAt: '2026-09-30T12:00:00.000Z',
  data: catalogOf(),
  origin: 'snapshot',
};

describe('loadNeoCatalog', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is ready with the catalog and where it came from', async () => {
    await expect(loadNeoCatalog(() => Promise.resolve(RESPONSE))).resolves.toEqual({
      status: 'ready',
      catalog: RESPONSE.data,
      origin: 'snapshot',
      fetchedAt: RESPONSE.fetchedAt,
    });
  });

  it('is unavailable, without throwing, when the loader rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = () => Promise.reject(new Error('offline'));
    await expect(loadNeoCatalog(failing)).resolves.toEqual({ status: 'unavailable' });
  });
});

describe('useNeoCatalog', () => {
  it('loads once across re-renders, then reports ready', async () => {
    const load = vi.fn(() => Promise.resolve(RESPONSE));
    const states: NeoCatalogState[] = [];
    function Probe({ label }: { label: string }) {
      states.push(useNeoCatalog(load));
      return <group name={label} />;
    }
    const renderer = await ReactThreeTestRenderer.create(<Probe label="first" />);
    await renderer.update(<Probe label="second" />);
    await ReactThreeTestRenderer.act(() => Promise.resolve());
    expect(load).toHaveBeenCalledTimes(1);
    expect(states[0]).toEqual({ status: 'loading' });
    expect(states.at(-1)).toMatchObject({ status: 'ready' });
    await renderer.unmount();
  });
});
