import type { NeoCatalog } from '@perihelion/data';
import { expect } from 'vitest';

export const J2000_JD_TDB = 2_451_545;

/** A one-NEO catalog on an orbit in the ecliptic; each test overrides only what it is about. */
export function catalogOf(overrides: Partial<NeoCatalog> = {}): NeoCatalog {
  return {
    count: 1,
    designation: ['433'],
    name: ['Eros'],
    epochJdTdb: [J2000_JD_TDB],
    eccentricity: [0.2],
    semiMajorAxisAu: [1.5],
    inclinationDeg: [0],
    longitudeOfAscendingNodeDeg: [0],
    argumentOfPerihelionDeg: [0],
    meanAnomalyDeg: [0],
    absoluteMagnitude: [11],
    orbitClass: ['AMO'],
    ...overrides,
  };
}

/** Component-wise closeness; `toEqual` would fail on the −0 the axis mapping can produce. */
export function expectCloseTo(
  actual: ArrayLike<number>,
  expected: readonly number[],
  digits = 6,
): void {
  expect(actual.length).toBe(expected.length);
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, digits));
}
