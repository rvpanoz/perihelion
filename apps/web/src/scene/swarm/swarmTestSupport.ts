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

/** Three NEOs, one per class Apollo/Aten/Amor, spread around their orbits: enough to mount the swarm in a scene. */
export const THREE_NEO_CATALOG = catalogOf({
  count: 3,
  designation: ['433', '99942', '3200'],
  name: ['Eros', 'Apophis', 'Phaethon'],
  epochJdTdb: [J2000_JD_TDB, J2000_JD_TDB, J2000_JD_TDB],
  eccentricity: [0.223, 0.191, 0.89],
  semiMajorAxisAu: [1.458, 0.923, 1.271],
  inclinationDeg: [10.8, 3.3, 22.3],
  longitudeOfAscendingNodeDeg: [304, 204, 265],
  argumentOfPerihelionDeg: [179, 127, 322],
  meanAnomalyDeg: [0, 120, 240],
  absoluteMagnitude: [10.4, 19.1, 14.3],
  orbitClass: ['AMO', 'ATE', 'APO'],
});
