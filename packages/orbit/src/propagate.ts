/** Two-body propagation: with no perturbations, only the mean anomaly advances. */

import { normalizeAngleRad } from './angles';
import { assertPositiveSemiMajorAxis } from './assertions';
import {
  type OrbitalElements,
  type StateVector,
  GM_SUN_AU3_PER_DAY2,
  createStateVector,
  stateFromElements,
} from './elements';

/** Kepler's third law, n = √(μ/a³) (Murray & Dermott eq. 2.26). */
export function meanMotionRadPerDay(semiMajorAxisAu: number): number {
  assertPositiveSemiMajorAxis(semiMajorAxisAu);
  return Math.sqrt(GM_SUN_AU3_PER_DAY2 / semiMajorAxisAu ** 3);
}

/** The same orbit with its epoch moved to `jdTdb`: M = M₀ + n·(t − t₀). */
export function propagateElements(elements: OrbitalElements, jdTdb: number): OrbitalElements {
  const elapsedDays = jdTdb - elements.epochJdTdb;
  const advanceRad = meanMotionRadPerDay(elements.semiMajorAxisAu) * elapsedDays;
  return {
    ...elements,
    meanAnomalyRad: normalizeAngleRad(elements.meanAnomalyRad + advanceRad),
    epochJdTdb: jdTdb,
  };
}

/** Heliocentric state at `jdTdb`. Pass `out` on hot paths to avoid allocating the result. */
export function stateAtTime(
  elements: OrbitalElements,
  jdTdb: number,
  out: StateVector = createStateVector(),
): StateVector {
  return stateFromElements(propagateElements(elements, jdTdb), out);
}
