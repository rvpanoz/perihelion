import type { DatasetName, DatasetResponse } from '@perihelion/data';
import { useEffect, useState } from 'react';
import { type DatasetLoader, loadDataset, loadDatasetOrUndefined } from './loadDataset';

export type DatasetState<N extends DatasetName> =
  { status: 'loading' } | ({ status: 'ready' } & DatasetResponse<N>) | { status: 'unavailable' };

export type { DatasetLoader } from './loadDataset';

const LOADING = { status: 'loading' } as const;

/**
 * Loads once, outside the canvas. The scene gets the data as a prop, so it never fetches: one React commit
 * when the data arrives, none per frame. Pass a stable `load` (module-level), or the effect reloads every render.
 */
export function useDataset<N extends DatasetName>(
  name: N,
  load?: DatasetLoader<N>,
): DatasetState<N> {
  const [state, setState] = useState<DatasetState<N>>(LOADING);
  useEffect(() => {
    let mounted = true;
    void loadDatasetState(load ?? (() => loadDataset(name))).then((next) => {
      if (mounted) setState(next);
    });
    return () => {
      mounted = false;
    };
  }, [name, load]);
  return state;
}

export async function loadDatasetState<N extends DatasetName>(
  load: DatasetLoader<N>,
): Promise<DatasetState<N>> {
  const response = await loadDatasetOrUndefined(load);
  if (response === undefined) return { status: 'unavailable' };
  return { status: 'ready', ...response };
}
