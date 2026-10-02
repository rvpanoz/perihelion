import type { CloseApproach } from '@perihelion/data';

/** One designation can pass twice in the window, so the time is part of the key. */
export function approachKey(approach: CloseApproach): string {
  return `${approach.designation} ${approach.approachJdTdb}`;
}
