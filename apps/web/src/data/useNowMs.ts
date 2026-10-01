import { useEffect, useState } from 'react';

/** Wall-clock time for text like "updated 12 min ago": coarse on purpose, so it never renders per frame. */
export function useNowMs(intervalMs: number): number {
  const [nowMs, setNowMs] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return nowMs;
}
