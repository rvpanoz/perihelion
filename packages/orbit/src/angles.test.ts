import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeAngleRad } from './angles';

const TWO_PI = 2 * Math.PI;

describe('normalizeAngleRad', () => {
  it.each([
    [0, 0],
    [TWO_PI, 0],
    [-Math.PI / 2, 1.5 * Math.PI],
    [5 * Math.PI, Math.PI],
  ])('wraps %d to %d', (angleRad, expectedRad) => {
    expect(normalizeAngleRad(angleRad)).toBeCloseTo(expectedRad, 12);
  });

  it('never returns 2π, even for a tiny negative angle', () => {
    expect(normalizeAngleRad(-1e-20)).toBe(0);
  });

  it('lands in [0, 2π) without changing the direction', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e4, max: 1e4, noNaN: true }), (angleRad) => {
        const wrappedRad = normalizeAngleRad(angleRad);
        expect(wrappedRad).toBeGreaterThanOrEqual(0);
        expect(wrappedRad).toBeLessThan(TWO_PI);
        expect(Math.cos(wrappedRad)).toBeCloseTo(Math.cos(angleRad), 9);
        expect(Math.sin(wrappedRad)).toBeCloseTo(Math.sin(angleRad), 9);
      }),
    );
  });
});
