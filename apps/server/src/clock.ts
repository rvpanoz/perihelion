/** Injected wherever time matters (TTLs, date windows, back-off) so tests control it. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };
