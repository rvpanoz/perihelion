import { describe, expect, it } from 'vitest';
import type { NeoCatalogState } from '../../data/useNeoCatalog';
import { swarmStatusText } from './swarmStatusText';
import { catalogOf } from './swarmTestSupport';

function ready(origin: 'fresh' | 'snapshot'): NeoCatalogState {
  return {
    status: 'ready',
    catalog: catalogOf({ count: 40_123 }),
    origin,
    fetchedAt: '2026-09-30T12:00:00.000Z',
  };
}

describe('swarmStatusText', () => {
  it('says the asteroids are loading', () => {
    expect(swarmStatusText({ status: 'loading' })).toBe('Loading asteroids…');
  });

  it('says the data is unavailable', () => {
    expect(swarmStatusText({ status: 'unavailable' })).toBe('Asteroid data unavailable');
  });

  it('gives the count, source and fetch date', () => {
    expect(swarmStatusText(ready('fresh'))).toBe(
      '40,123 near-Earth asteroids · JPL SBDB · 2026-09-30',
    );
  });

  it('says when the data is the bundled snapshot', () => {
    expect(swarmStatusText(ready('snapshot'))).toBe(
      '40,123 near-Earth asteroids · JPL SBDB · 2026-09-30 (bundled snapshot)',
    );
  });
});
