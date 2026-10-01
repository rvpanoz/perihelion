import type { DatasetResponse } from '@perihelion/data';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it } from 'vitest';
import { catalogOf } from '../scene/swarm/swarmTestSupport';
import type { DatasetState } from './useDataset';
import { useNeoCatalog } from './useNeoCatalog';

const RESPONSE: DatasetResponse<'neos'> = {
  fetchedAt: '2026-09-30T12:00:00.000Z',
  data: catalogOf(),
  origin: 'snapshot',
};
const load = () => Promise.resolve(RESPONSE);

describe('useNeoCatalog', () => {
  it('reports the catalog once its loader resolves', async () => {
    const states: DatasetState<'neos'>[] = [];
    function Probe() {
      states.push(useNeoCatalog(load));
      return <group />;
    }
    const renderer = await ReactThreeTestRenderer.create(<Probe />);
    await ReactThreeTestRenderer.act(() => Promise.resolve());
    expect(states.at(-1)).toMatchObject({ status: 'ready', data: RESPONSE.data });
    await renderer.unmount();
  });
});
