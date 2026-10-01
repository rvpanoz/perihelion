import type { CloseApproach } from '@perihelion/data';
import { useSyncExternalStore } from 'react';

/** The approach the viewer picked. Like `timeStore`, it notifies on user actions only, never per frame. */
export class ApproachSelection {
  #selected: CloseApproach | undefined;
  readonly #listeners = new Set<() => void>();

  get selected(): CloseApproach | undefined {
    return this.#selected;
  }

  /** Arrow properties, so they can be passed unbound: `select` as a list's `onSelect`, `subscribe` to React. */
  select = (approach: CloseApproach): void => {
    this.#selected = approach;
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

export const approachSelection = new ApproachSelection();

export function useSelectedApproach(): CloseApproach | undefined {
  return useSyncExternalStore(approachSelection.subscribe, readSelectedApproach);
}

function readSelectedApproach(): CloseApproach | undefined {
  return approachSelection.selected;
}
