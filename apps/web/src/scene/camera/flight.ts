import type { Vector3 } from '@perihelion/orbit';
import type { FocusId } from './focusPositions';

/** Where the scene origin is (float64, heliocentric ecliptic) and how far the camera is from it. */
export interface CameraPose {
  originAu: Vector3;
  distanceAu: number;
}

export interface Flight {
  from: CameraPose;
  to: FocusId;
  toDistanceAu: number;
  startSeconds: number;
  durationSeconds: number;
}

/** Distance ratios this close to 1 leave no zoom to tie the origin to, and would divide by almost 0. */
const SAME_DISTANCE_TOLERANCE = 1e-9;

/** Zero velocity at both ends, so a flight never jerks the camera on departure or arrival. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

export function flightProgress(flight: Flight, nowSeconds: number): number {
  if (flight.durationSeconds <= 0) return 1;
  const progress = (nowSeconds - flight.startSeconds) / flight.durationSeconds;
  return Math.min(Math.max(progress, 0), 1);
}

/**
 * How far along the origin is, 0 → 1, tied to the zoom rather than to time. With d = d₀·rᵉ, it is the fraction of
 * the distance change covered, (rᵉ − 1)/(r − 1). On a pull-back the origin then moves no faster than the view
 * widens, so the departure point stays in view; on a zoom-in it closes in as the view narrows, so the target stays
 * in view. Exact at both ends (r⁰ = 1, r¹ = r). With no change of distance it follows the eased progress.
 */
export function originProgress(eased: number, distanceRatio: number): number {
  if (Math.abs(distanceRatio - 1) < SAME_DISTANCE_TOLERANCE) return eased;
  const fraction = (distanceRatio ** eased - 1) / (distanceRatio - 1);
  // A zoom-in starts at 0 / (r − 1) = −0, and rounding can stray past either end; clamping gives exact +0 and 1.
  return Math.min(Math.max(fraction, 0), 1);
}

/**
 * The origin moves toward the target's *current* position, so a moving planet is met where it is on arrival.
 * Distance eases in log space: a 3 AU → 3e-4 AU zoom spends equal time per decade instead of covering almost
 * all of it in the first frames. The origin follows the zoom (`originProgress`), so the view keeps its subject.
 */
export function writeFlightPose(
  step: { flight: Flight; targetAu: Readonly<Vector3>; progress: number },
  out: CameraPose,
): CameraPose {
  const eased = easeInOutCubic(step.progress);
  const { from, toDistanceAu } = step.flight;
  const originFraction = originProgress(eased, toDistanceAu / from.distanceAu);
  for (const axis of [0, 1, 2] as const) {
    out.originAu[axis] = lerp(from.originAu[axis], step.targetAu[axis], originFraction);
  }
  out.distanceAu = Math.exp(lerp(Math.log(from.distanceAu), Math.log(toDistanceAu), eased));
  return out;
}

/** Exact at both ends (`t = 1` returns `to`), which `a + (b − a)·t` is not. */
function lerp(from: number, to: number, t: number): number {
  return from * (1 - t) + to * t;
}
