import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Vector3, cross, dot, norm } from './vector3';

const component = fc.double({ min: -1e3, max: 1e3, noNaN: true });
const vector: fc.Arbitrary<Vector3> = fc.tuple(component, component, component);

describe('dot', () => {
  it('sums the component products', () => {
    expect(dot([1, 2, 3], [4, -5, 6])).toBe(12);
  });
});

describe('cross', () => {
  it('follows the right-hand rule', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(cross([0, 1, 0], [1, 0, 0])).toEqual([0, 0, -1]);
  });

  it('is perpendicular to both inputs', () => {
    fc.assert(
      fc.property(vector, vector, (first, second) => {
        const product = cross(first, second);
        const scale = norm(first) * norm(second) * norm(product) + 1;
        expect(Math.abs(dot(product, first)) / scale).toBeLessThan(1e-12);
        expect(Math.abs(dot(product, second)) / scale).toBeLessThan(1e-12);
      }),
    );
  });
});

describe('norm', () => {
  it('is the Euclidean length', () => {
    expect(norm([3, 4, 12])).toBe(13);
  });
});
