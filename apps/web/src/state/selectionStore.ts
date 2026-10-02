import { useSyncExternalStore } from 'react';

/** What the viewer picked. Like `timeStore`, it notifies on user actions only, never per frame. */
export class SelectionStore<T> {
  #selected: T | undefined;
  readonly #listeners = new Set<() => void>();

  get selected(): T | undefined {
    return this.#selected;
  }

  /** Arrow properties, so they can be passed unbound: `select` as a list's `onSelect`, `subscribe` to React. */
  select = (item: T): void => {
    this.#selected = item;
    this.#notify();
  };

  clear = (): void => {
    this.#selected = undefined;
    this.#notify();
  };

  /**
   * After a data swap: points at the selected row's counterpart (same key) in the new list. False when the list no
   * longer has it; the caller clears, since clearing may move the camera too.
   */
  reselectFrom = (items: readonly T[], keyOf: (item: T) => string): boolean => {
    if (this.#selected === undefined) return true;
    const key = keyOf(this.#selected);
    const counterpart = items.find((item) => keyOf(item) === key);
    if (counterpart !== undefined) this.select(counterpart);
    return counterpart !== undefined;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export function useSelection<T>(store: SelectionStore<T>): T | undefined {
  return useSyncExternalStore(store.subscribe, () => store.selected);
}
