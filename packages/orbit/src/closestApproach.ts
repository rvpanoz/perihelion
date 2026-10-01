/** Closest approach of a two-body orbit to Earth, found on the engine itself. */

import { type OrbitalElements, createStateVector } from './elements';
import { planetStateAt } from './planets';
import { stateAtTime } from './propagate';
import { type Vector3, norm } from './vector3';

export interface ClosestApproach {
  jdTdb: number;
  distanceAu: number;
}

export interface MinimumSearch {
  distanceAtJd: (jdTdb: number) => number;
  aroundJdTdb: number;
}

export interface GeocentricRequest {
  elements: OrbitalElements;
  jdTdb: number;
}

/** CAD's t_sigma can be days; ±3 d at hourly steps brackets the engine's minimum even when it drifts from CAD's. */
const SEARCH_HALF_WINDOW_DAYS = 3;
const SEARCH_STEP_DAYS = 1 / 24;
/** ≈ 9 ms. JD near 2.46e6 resolves to ~4e-10 d in float64, so this is well above rounding. */
const REFINE_TOLERANCE_DAYS = 1e-7;
const INVERSE_GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

const scratchBody = createStateVector();
const scratchEarth = createStateVector();
const scratchOffset: Vector3 = [0, 0, 0];

/** Body minus the Earth–Moon barycentre: Standish has no Earth, so this is ≈ 4,670 km from geocentric. */
export function writeGeocentricOffset(request: GeocentricRequest, out: Vector3): Vector3 {
  const body = stateAtTime(request.elements, request.jdTdb, scratchBody).positionAu;
  const earth = planetStateAt('earthMoonBarycenter', request.jdTdb, scratchEarth).positionAu;
  for (const axis of [0, 1, 2] as const) out[axis] = body[axis] - earth[axis];
  return out;
}

export function closestApproach(elements: OrbitalElements, aroundJdTdb: number): ClosestApproach {
  const distanceAtJd = (jdTdb: number) =>
    norm(writeGeocentricOffset({ elements, jdTdb }, scratchOffset));
  return findClosestApproach({ distanceAtJd, aroundJdTdb });
}

/** Hourly scan for the bracket, then golden-section search inside it (Press et al., Numerical Recipes §10.2). */
export function findClosestApproach(search: MinimumSearch): ClosestApproach {
  const coarseJdTdb = coarseMinimumJdTdb(search);
  const jdTdb = goldenSectionMinimum(search.distanceAtJd, {
    lowJdTdb: coarseJdTdb - SEARCH_STEP_DAYS,
    highJdTdb: coarseJdTdb + SEARCH_STEP_DAYS,
  });
  return { jdTdb, distanceAu: search.distanceAtJd(jdTdb) };
}

/** Steps counted in integers so the samples land exactly on the grid instead of accumulating rounding. */
function coarseMinimumJdTdb({ distanceAtJd, aroundJdTdb }: MinimumSearch): number {
  const steps = Math.round((2 * SEARCH_HALF_WINDOW_DAYS) / SEARCH_STEP_DAYS);
  let bestJdTdb = aroundJdTdb;
  let bestDistanceAu = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= steps; step += 1) {
    const jdTdb = aroundJdTdb - SEARCH_HALF_WINDOW_DAYS + step * SEARCH_STEP_DAYS;
    const distanceAu = distanceAtJd(jdTdb);
    if (distanceAu < bestDistanceAu) [bestJdTdb, bestDistanceAu] = [jdTdb, distanceAu];
  }
  return bestJdTdb;
}

function goldenSectionMinimum(
  distanceAtJd: (jdTdb: number) => number,
  bracket: { lowJdTdb: number; highJdTdb: number },
): number {
  let { lowJdTdb, highJdTdb } = bracket;
  while (highJdTdb - lowJdTdb > REFINE_TOLERANCE_DAYS) {
    const span = INVERSE_GOLDEN_RATIO * (highJdTdb - lowJdTdb);
    const leftJdTdb = highJdTdb - span;
    const rightJdTdb = lowJdTdb + span;
    if (distanceAtJd(leftJdTdb) < distanceAtJd(rightJdTdb)) highJdTdb = rightJdTdb;
    else lowJdTdb = leftJdTdb;
  }
  return (lowJdTdb + highJdTdb) / 2;
}
