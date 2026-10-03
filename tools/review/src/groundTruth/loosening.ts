/** Kinds where the changed number is the limit itself, so code can tell which way it moved. */
const DIRECTIONAL_KINDS = [
  'upper-bound',
  'closeness-digits',
  'margin-multiplier',
  'lower-bound',
] as const;
type DirectionalKind = (typeof DIRECTIONAL_KINDS)[number];
// A number inside a larger bound expression (`edgeStep / 1000`, `(1 - 1e-12)`) can loosen the bound whichever way
// it moves, so its direction is never guessed: any change blocks (found in the branch review, 2026-10-03).
export const TOLERANCE_KINDS = [...DIRECTIONAL_KINDS, 'bound-term'] as const;
export type ToleranceKind = (typeof TOLERANCE_KINDS)[number];
export type NumberKind = ToleranceKind | 'not-a-tolerance';
export type Direction = 'looser' | 'tighter' | 'equal' | 'unknown';

// A bigger bound or margin admits more error; more toBeCloseTo digits or a bigger required minimum admits less.
const BIGGER_IS_LOOSER: Readonly<Record<DirectionalKind, boolean>> = {
  'upper-bound': true,
  'margin-multiplier': true,
  'closeness-digits': false,
  'lower-bound': false,
};

export function directionOf(
  kind: ToleranceKind,
  change: { oldValue: number; newValue: number },
): Direction {
  if (change.newValue === change.oldValue) return 'equal';
  if (kind === 'bound-term') return 'unknown';
  return change.newValue > change.oldValue === BIGGER_IS_LOOSER[kind] ? 'looser' : 'tighter';
}

/** The guard's rule: block what loosens and what cannot be told apart from loosening. */
export function directionBlocks(direction: Direction): boolean {
  return direction === 'looser' || direction === 'unknown';
}

export function isToleranceKind(kind: NumberKind): kind is ToleranceKind {
  return kind !== 'not-a-tolerance';
}
