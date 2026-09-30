export type OpeningPhase = 'waiting' | 'playing' | 'done';

/**
 * The opening's phase, for React outside the canvas (the caption). It changes at most twice per page load and
 * never per frame, so subscribers only hear about real changes.
 */
export class OpeningStore {
  #phase: OpeningPhase = 'waiting';
  readonly #listeners = new Set<() => void>();

  get phase(): OpeningPhase {
    return this.#phase;
  }

  setPhase(phase: OpeningPhase): void {
    if (phase === this.#phase) return;
    this.#phase = phase;
    for (const listener of this.#listeners) listener();
  }

  /** An arrow property so it can be passed to `useSyncExternalStore` unbound. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };
}

export const openingStore = new OpeningStore();
