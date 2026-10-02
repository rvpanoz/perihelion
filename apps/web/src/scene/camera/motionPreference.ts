const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Read on every call rather than cached, so turning the system setting on mid-session applies to the next flight
 * without a listener. False where there is no `matchMedia` (Node tests).
 */
export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}
