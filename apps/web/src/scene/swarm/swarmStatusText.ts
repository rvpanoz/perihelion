import type { NeoCatalogState } from '../../data/useNeoCatalog';

/** The count and date are facts from the data; where it came from is said plainly. */
export function swarmStatusText(state: NeoCatalogState): string {
  if (state.status === 'loading') return 'Loading asteroids…';
  if (state.status === 'unavailable') return 'Asteroid data unavailable';
  const count = state.catalog.count.toLocaleString('en-US');
  const source = `${count} near-Earth asteroids · JPL SBDB · ${state.fetchedAt.slice(0, 10)}`;
  return state.origin === 'snapshot' ? `${source} (bundled snapshot)` : source;
}
