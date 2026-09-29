import {
  type Planet,
  createStateVector,
  planetElementsAt,
  stateFromElements,
} from '@perihelion/orbit';
import { sceneAxesFromEcliptic } from '../sceneFrame';

export const ORBIT_PATH_POINTS = 256;

/**
 * Standish's element rates move the fastest-drifting node or perihelion by well under a degree per century,
 * so a path resampled once a simulated year is indistinguishable from one resampled every frame.
 */
export const ORBIT_PATH_REFRESH_DAYS = 365.25;

const scratchState = createStateVector();

/**
 * One revolution of the planet's osculating ellipse at `jdTdb`, relative to the Sun, in scene axes. Equal steps
 * in mean anomaly are equal steps in time, so points thin out slightly at perihelion; with e ≤ 0.21 (Mercury)
 * that is invisible at line width.
 */
export function writeOrbitPath(
  request: { planet: Planet; jdTdb: number },
  out: Float32Array,
): Float32Array {
  const elements = { ...planetElementsAt(request.planet, request.jdTdb) };
  for (let index = 0; index < ORBIT_PATH_POINTS; index += 1) {
    elements.meanAnomalyRad = (2 * Math.PI * index) / ORBIT_PATH_POINTS;
    out.set(sceneAxesFromEcliptic(stateFromElements(elements, scratchState).positionAu), index * 3);
  }
  return out;
}

export function orbitPathIsStale(pathJdTdb: number | undefined, jdTdb: number): boolean {
  return pathJdTdb === undefined || Math.abs(jdTdb - pathJdTdb) >= ORBIT_PATH_REFRESH_DAYS;
}
