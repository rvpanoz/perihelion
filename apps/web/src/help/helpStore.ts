import { readStored, writeStored } from '../state/safeStorage';

const HINT_SEEN_KEY = 'perihelion.helpHintSeen';

/**
 * Whether the help dialog is open, and whether this browser has seen the first-visit hint. Opening help by any route
 * counts as seeing the hint: the viewer has found what it points to. Both change on user actions only.
 */
export class HelpStore {
  #isOpen = false;
  #hintSeen = readStored(HINT_SEEN_KEY) === 'true';
  readonly #listeners = new Set<() => void>();

  get isOpen(): boolean {
    return this.#isOpen;
  }

  get hintSeen(): boolean {
    return this.#hintSeen;
  }

  /** Arrow properties, so they can be passed unbound: as `onClick`, to the key listener and to React. */
  open = (): void => {
    if (this.#isOpen) return;
    this.#isOpen = true;
    this.#markHintSeen();
    this.#notify();
  };

  close = (): void => {
    if (!this.#isOpen) return;
    this.#isOpen = false;
    this.#notify();
  };

  dismissHint = (): void => {
    if (this.#hintSeen) return;
    this.#markHintSeen();
    this.#notify();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #markHintSeen(): void {
    this.#hintSeen = true;
    writeStored(HINT_SEEN_KEY, 'true');
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const helpStore = new HelpStore();
