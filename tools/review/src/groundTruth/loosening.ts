export const TOLERANCE_KINDS = [
  'upper-bound',
  'closeness-digits',
  'margin-multiplier',
  'lower-bound',
] as const;
export type ToleranceKind = (typeof TOLERANCE_KINDS)[number];
export type NumberKind = ToleranceKind | 'not-a-tolerance';
export type Direction = 'looser' | 'tighter' | 'equal';

// A bigger bound or margin admits more error; more toBeCloseTo digits or a bigger required minimum admits less.
const BIGGER_IS_LOOSER: Readonly<Record<ToleranceKind, boolean>> = {
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
  return change.newValue > change.oldValue === BIGGER_IS_LOOSER[kind] ? 'looser' : 'tighter';
}

export function isToleranceKind(kind: NumberKind): kind is ToleranceKind {
  return kind !== 'not-a-tolerance';
}
