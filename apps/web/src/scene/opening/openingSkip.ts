/** Any of these means the viewer wants control, so the opening ends at once at its final state. */
export const OPENING_SKIP_EVENTS = ['pointerdown', 'wheel', 'keydown'] as const;

/** Returns the unsubscribe. The target is injected because the web tests have no DOM. */
export function listenForSkip(target: EventTarget, onSkip: () => void): () => void {
  for (const type of OPENING_SKIP_EVENTS) target.addEventListener(type, onSkip);
  return () => {
    for (const type of OPENING_SKIP_EVENTS) target.removeEventListener(type, onSkip);
  };
}

/** The dev-only `?opening=off`, handy while working on other scenes. */
export function openingOffInUrl(search: string): boolean {
  return new URLSearchParams(search).get('opening') === 'off';
}

/** Reduced motion, or `?opening=off` in dev, starts at the final state with no move. Reads the browser. */
export function browserSkipsOpeningMove(): boolean {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reducedMotion || (import.meta.env.DEV && openingOffInUrl(window.location.search));
}
