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
