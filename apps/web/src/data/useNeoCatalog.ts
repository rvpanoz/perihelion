import { useEffect, useState } from 'react';
import { timeStore } from '../time/timeStore';
import type { NeoCatalogMessage, NeoCatalogRequest, NeoCatalogSummary } from './neoCatalogMessage';
import {
  BROWSER_NEO_CATALOG_SOURCE,
  type NeoCatalogSource,
  type StopLoading,
} from './neoCatalogSource';
import { type StopRetrying, needsServerRetry, retryUntilAnswered } from './serverRetry';

export type NeoCatalogState =
  { status: 'loading' } | ({ status: 'ready' } & NeoCatalogSummary) | { status: 'unavailable' };

type SetCatalogState = (state: NeoCatalogState) => void;

const LOADING = { status: 'loading' } as const;

/**
 * Without the catalog the scene runs on with no swarm; the data-status pill says why. While the swarm shows the
 * bundled snapshot, the server is asked again in the background and the live catalog replaces it. Pass a stable
 * `source` (module-level), or the effect reloads every render.
 */
export function useNeoCatalog(
  source: NeoCatalogSource = BROWSER_NEO_CATALOG_SOURCE,
): NeoCatalogState {
  const [state, setState] = useState<NeoCatalogState>(LOADING);
  useEffect(() => keepLoadingCatalog(source, setState), [source]);
  return state;
}

export function neoCatalogState(message: NeoCatalogMessage): NeoCatalogState {
  if (message.kind === 'unavailable') return { status: 'unavailable' };
  return { status: 'ready', ...message.summary };
}

function keepLoadingCatalog(source: NeoCatalogSource, setState: SetCatalogState): () => void {
  let stopRetrying: StopRetrying | undefined;
  const stopFirstLoad = source(currentRequest(), (message) => {
    const first = neoCatalogState(message);
    setState(first);
    stopRetrying?.();
    if (needsServerRetry(first)) stopRetrying = retryCatalog(source, setState);
  });
  return () => {
    stopFirstLoad();
    stopRetrying?.();
  };
}

function retryCatalog(source: NeoCatalogSource, setState: SetCatalogState): StopRetrying {
  return retryUntilAnswered({
    attempt: (signal) => askServerOnce(source, signal),
    onAnswer: setState,
  });
}

/** One server-only load, worker included; `undefined` when the server did not answer. Its worker ends with it. */
function askServerOnce(
  source: NeoCatalogSource,
  signal: AbortSignal,
): Promise<NeoCatalogState | undefined> {
  let stop: StopLoading = () => undefined;
  const answer = new Promise<NeoCatalogState | undefined>((resolve) => {
    stop = source({ ...currentRequest(), serverOnly: true }, (message) =>
      resolve(message.kind === 'ready' ? neoCatalogState(message) : undefined),
    );
    signal.addEventListener('abort', () => resolve(undefined), { once: true });
  });
  return answer.finally(() => stop());
}

/** The reference epoch is the simulation time when loading starts: the attributes carry it, so a late answer is
 * still exact. */
function currentRequest(): NeoCatalogRequest {
  return { referenceJdTdb: timeStore.state.jdTdb };
}
