import { describe, expect, it } from 'vitest';
import { type ToleranceKind, directionOf } from './loosening.js';

const CASES: readonly [ToleranceKind, number, number, string][] = [
  ['upper-bound', 1e-11, 1e-9, 'looser'],
  ['upper-bound', 1e-9, 1e-11, 'tighter'],
  ['upper-bound', -0.5, -0.4, 'looser'],
  ['margin-multiplier', 1.25, 1.5, 'looser'],
  ['margin-multiplier', 1.25, 1.1, 'tighter'],
  ['closeness-digits', 12, 11, 'looser'],
  ['closeness-digits', 12, 14, 'tighter'],
  ['lower-bound', 0.999, 0.99, 'looser'],
  ['lower-bound', 0.99, 0.999, 'tighter'],
];

describe('directionOf', () => {
  it.each(CASES)('%s %d → %d is %s', (kind, oldValue, newValue, expected) => {
    expect(directionOf(kind, { oldValue, newValue })).toBe(expected);
  });

  it('calls an unchanged value equal for every kind', () => {
    for (const [kind] of CASES)
      expect(directionOf(kind, { oldValue: 2, newValue: 2 })).toBe('equal');
  });
});
