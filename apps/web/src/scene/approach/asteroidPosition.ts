import type { CloseApproach } from '@perihelion/data';
import {
  type OrbitalElements,
  type Vector3,
  createStateVector,
  elementsFromDegrees,
  stateAtTime,
} from '@perihelion/orbit';

/** Heliocentric ecliptic J2000, float64: written at `FRAME_PRIORITY.bodyPositions`, read by the rig and marker. */
export const asteroidPositionAu: Vector3 = [0, 0, 0];

const elementsCache = new WeakMap<CloseApproach, OrbitalElements>();
const scratchState = createStateVector();

/** Memoised by row identity, so a click and the next frame see the same elements without waiting on React. */
export function elementsForApproach(approach: CloseApproach): OrbitalElements {
  const cached = elementsCache.get(approach);
  if (cached !== undefined) return cached;
  const elements = elementsFromDegrees(approach.orbit);
  elementsCache.set(approach, elements);
  return elements;
}

export function updateAsteroidPosition(approach: CloseApproach, jdTdb: number): void {
  const [x, y, z] = stateAtTime(elementsForApproach(approach), jdTdb, scratchState).positionAu;
  asteroidPositionAu[0] = x;
  asteroidPositionAu[1] = y;
  asteroidPositionAu[2] = z;
}
