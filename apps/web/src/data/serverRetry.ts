import type { DatasetOrigin } from '@perihelion/data';

const FIRST_RETRY_DELAY_MS = 4_000;
const MAX_RETRY_DELAY_MS = 60_000;

/** A retry waits for headers far longer than the first load: nothing waits on it, and a free-tier server can take
 * ~50 s to wake. */
export const RETRY_SERVER_TIMEOUT_MS = 30_000;

export type StopRetrying = () => void;

/** What both `useDataset`'s and the NEO catalog's states have in common. */
export type LoadedFrom =
  { status: 'loading' | 'unavailable' } | { status: 'ready'; origin: DatasetOrigin };

export interface ServerRetry<T> {
  /** One server attempt; `undefined` (or a rejection) means no answer yet. */
  attempt: (signal: AbortSignal) => Promise<T | undefined>;
  onAnswer: (answer: T) => void;
}

/** 4 s, 8 s, 16 s, 32 s, then every 60 s. */
export function retryDelayMs(retryIndex: number): number {
  return Math.min(FIRST_RETRY_DELAY_MS * 2 ** retryIndex, MAX_RETRY_DELAY_MS);
}

/**
 * Showing the bundled snapshot, or nothing: keep asking our server. Any answer from it ends the retries, even its
 * own snapshot (JPL down): the server then does the retrying upstream.
 */
export function needsServerRetry(state: LoadedFrom): boolean {
  if (state.status === 'ready') return state.origin === 'snapshot';
  return state.status === 'unavailable';
}

/** Asks again after each delay until the server answers; the next wait starts when an attempt ends. */
export function retryUntilAnswered<T>({ attempt, onAnswer }: ServerRetry<T>): StopRetrying {
  const stopped = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tryOnce = async (retryIndex: number) => {
    const answer = await attempt(stopped.signal).catch(() => undefined);
    if (stopped.signal.aborted) return;
    if (answer === undefined) schedule(retryIndex + 1);
    else onAnswer(answer);
  };
  const schedule = (retryIndex: number) => {
    timer = setTimeout(() => void tryOnce(retryIndex), retryDelayMs(retryIndex));
  };
  schedule(0);
  return () => {
    stopped.abort();
    clearTimeout(timer);
  };
}
