import type { DatasetOrigin, DatasetResponse, NeoCatalog } from '@perihelion/data';
import { useEffect, useState } from 'react';
import { loadDataset } from './loadDataset';

export type NeoCatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: NeoCatalog; origin: DatasetOrigin; fetchedAt: string }
  | { status: 'unavailable' };

export type NeoCatalogLoader = () => Promise<DatasetResponse<'neos'>>;

const LOADING: NeoCatalogState = { status: 'loading' };
const loadNeos: NeoCatalogLoader = () => loadDataset('neos');

/**
 * Loads once, outside the canvas. The scene gets the catalog as a prop, so it never fetches: one React commit
 * when the data arrives, none per frame.
 */
export function useNeoCatalog(load: NeoCatalogLoader = loadNeos): NeoCatalogState {
  const [state, setState] = useState(LOADING);
  useEffect(() => {
    let mounted = true;
    void loadNeoCatalog(load).then((next) => {
      if (mounted) setState(next);
    });
    return () => {
      mounted = false;
    };
  }, [load]);
  return state;
}

export async function loadNeoCatalog(load: NeoCatalogLoader): Promise<NeoCatalogState> {
  const response = await responseOrUndefined(load);
  if (response === undefined) return { status: 'unavailable' };
  const { data: catalog, origin, fetchedAt } = response;
  return { status: 'ready', catalog, origin, fetchedAt };
}

/** Both the server and the snapshot failed: the scene runs on without a swarm. */
async function responseOrUndefined(
  load: NeoCatalogLoader,
): Promise<DatasetResponse<'neos'> | undefined> {
  try {
    return await load();
  } catch (error) {
    console.warn('No NEO catalog; drawing no swarm', error);
    return undefined;
  }
}
