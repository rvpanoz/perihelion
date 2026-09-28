import type { DatasetRequest } from './types.js';

interface ScheduledRefreshOptions {
  /** Must never reject: ticks run unawaited, and an unhandled rejection would stop the server. */
  service: { refreshIfStale(request: DatasetRequest): Promise<void> };
  /** Rebuilt on every tick: date windows move with the clock. */
  requests: () => readonly DatasetRequest[];
  intervalMs: number;
}

/**
 * Warms the cache at start-up and keeps it warm, so visitors rarely wait on upstream. One dataset at a
 * time: the upstream gates would serialize them anyway. Returns a function that stops the schedule.
 */
export function startScheduledRefresh(options: ScheduledRefreshOptions): () => void {
  const tick = () => refreshInTurn(options);
  void tick();
  const timer = setInterval(() => void tick(), options.intervalMs);
  // Never keep the process alive just for a refresh.
  timer.unref();
  return () => clearInterval(timer);
}

async function refreshInTurn({ service, requests }: ScheduledRefreshOptions): Promise<void> {
  for (const request of requests()) await service.refreshIfStale(request);
}
