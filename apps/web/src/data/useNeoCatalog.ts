import { useEffect, useState } from 'react';
import { timeStore } from '../time/timeStore';
import type { NeoCatalogMessage, NeoCatalogSummary } from './neoCatalogMessage';
import { BROWSER_NEO_CATALOG_SOURCE, type NeoCatalogSource } from './neoCatalogSource';

export type NeoCatalogState =
  { status: 'loading' } | ({ status: 'ready' } & NeoCatalogSummary) | { status: 'unavailable' };

const LOADING = { status: 'loading' } as const;

/**
 * Without the catalog the scene runs on with no swarm; the data-status pill says why. The reference epoch is the
 * simulation time when loading starts: the attributes carry it, so a late answer is still exact. Pass a stable
 * `source` (module-level), or the effect reloads every render.
 */
export function useNeoCatalog(
  source: NeoCatalogSource = BROWSER_NEO_CATALOG_SOURCE,
): NeoCatalogState {
  const [state, setState] = useState<NeoCatalogState>(LOADING);
  useEffect(
    () =>
      source({ referenceJdTdb: timeStore.state.jdTdb }, (message) =>
        setState(neoCatalogState(message)),
      ),
    [source],
  );
  return state;
}

export function neoCatalogState(message: NeoCatalogMessage): NeoCatalogState {
  if (message.kind === 'unavailable') return { status: 'unavailable' };
  return { status: 'ready', ...message.summary };
}
