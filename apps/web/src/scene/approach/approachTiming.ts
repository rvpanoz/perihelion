import type { CloseApproach } from '@perihelion/data';
import { KM_PER_AU } from '@perihelion/orbit';

const SECONDS_PER_DAY = 86_400;
/** CAD's schema allows 0; 0.1 km/s is far below any real Earth encounter, so it only guards the division. */
const MIN_RELATIVE_SPEED_KM_PER_S = 0.1;
/** A very slow, distant pass would otherwise play over months; ten days keeps the shot one sweep. */
const MAX_CROSSING_DAYS = 10;

/** τ = d / v: how long the asteroid takes to cover its own miss distance, the natural clock of a flyby. */
export function crossingDays(
  approach: Pick<CloseApproach, 'distanceAu' | 'relativeVelocityKmPerS'>,
): number {
  const distanceKm = approach.distanceAu * KM_PER_AU;
  const speedKmPerS = Math.max(approach.relativeVelocityKmPerS, MIN_RELATIVE_SPEED_KM_PER_S);
  return Math.min(distanceKm / speedKmPerS / SECONDS_PER_DAY, MAX_CROSSING_DAYS);
}
