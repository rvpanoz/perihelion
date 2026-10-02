import type { DatasetName, DatasetResponse } from '@perihelion/data';
import { useEffect, useState } from 'react';
import {
  type DatasetLoader,
  type ServerDatasetLoader,
  loadDataset,
  loadDatasetOrUndefined,
  loadFromServer,
} from './loadDataset';
import {
  RETRY_SERVER_TIMEOUT_MS,
  type StopRetrying,
  needsServerRetry,
  retryUntilAnswered,
} from './serverRetry';

export type DatasetState<N extends DatasetName> =
  { status: 'loading' } | ({ status: 'ready' } & DatasetResponse<N>) | { status: 'unavailable' };

export type { DatasetLoader } from './loadDataset';

/** The first load (server, else snapshot) and the server-only attempt the retries make. */
export interface DatasetSources<N extends DatasetName> {
  load: DatasetLoader<N>;
  loadFromServer: ServerDatasetLoader<N>;
}

type SetDatasetState<N extends DatasetName> = (state: DatasetState<N>) => void;

const LOADING = { status: 'loading' } as const;

export function browserDatasetSources<N extends DatasetName>(name: N): DatasetSources<N> {
  return {
    load: () => loadDataset(name),
    loadFromServer: (signal) =>
      loadFromServer(name, { signal, serverTimeoutMs: RETRY_SERVER_TIMEOUT_MS }),
  };
}

/**
 * Loads outside the canvas. The scene gets the data as a prop, so it never fetches: one React commit when the data
 * arrives, and one more if live data later replaces the snapshot, none per frame. Pass stable `sources`
 * (module-level), or the effect reloads every render.
 */
export function useDataset<N extends DatasetName>(
  name: N,
  sources?: DatasetSources<N>,
): DatasetState<N> {
  const [state, setState] = useState<DatasetState<N>>(LOADING);
  useEffect(() => keepLoading(sources ?? browserDatasetSources(name), setState), [name, sources]);
  return state;
}

/** The first load, then server retries while it shows the snapshot (or nothing). Returns the cleanup. */
function keepLoading<N extends DatasetName>(
  sources: DatasetSources<N>,
  setState: SetDatasetState<N>,
): () => void {
  let mounted = true;
  let stopRetrying: StopRetrying | undefined;
  void loadDatasetState(sources.load).then((first) => {
    if (!mounted) return;
    setState(first);
    if (needsServerRetry(first)) stopRetrying = retryServer(sources.loadFromServer, setState);
  });
  return () => {
    mounted = false;
    stopRetrying?.();
  };
}

function retryServer<N extends DatasetName>(
  load: ServerDatasetLoader<N>,
  setState: SetDatasetState<N>,
): StopRetrying {
  return retryUntilAnswered({
    attempt: load,
    onAnswer: (response) => setState({ status: 'ready', ...response }),
  });
}

export async function loadDatasetState<N extends DatasetName>(
  load: DatasetLoader<N>,
): Promise<DatasetState<N>> {
  const response = await loadDatasetOrUndefined(load);
  if (response === undefined) return { status: 'unavailable' };
  return { status: 'ready', ...response };
}
