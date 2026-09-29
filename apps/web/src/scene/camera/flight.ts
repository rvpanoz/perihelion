import type { Vector3 } from '@perihelion/orbit';
import type { BodyId } from '../bodies/bodyCatalog';

/** Where the scene origin is (float64, heliocentric ecliptic) and how far the camera is from it. */
export interface CameraPose {
  originAu: Vector3;
  distanceAu: number;
}

export interface Flight {
  from: CameraPose;
  to: BodyId;
  toDistanceAu: number;
  startSeconds: number;
  durationSeconds: number;
}

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
 * The origin eases toward the target's *current* position, so a moving planet is met where it is on arrival.
 * Distance eases in log space: a 3 AU → 3e-4 AU zoom spends equal time per decade instead of covering almost
 * all of it in the first frames.
 */
export function writeFlightPose(
  step: { flight: Flight; targetAu: Readonly<Vector3>; progress: number },
  out: CameraPose,
): CameraPose {
  const eased = easeInOutCubic(step.progress);
  const { from, toDistanceAu } = step.flight;
  for (const axis of [0, 1, 2] as const) {
    out.originAu[axis] = lerp(from.originAu[axis], step.targetAu[axis], eased);
  }
  out.distanceAu = Math.exp(lerp(Math.log(from.distanceAu), Math.log(toDistanceAu), eased));
  return out;
}

/** Exact at both ends (`t = 1` returns `to`), which `a + (b − a)·t` is not. */
function lerp(from: number, to: number, t: number): number {
  return from * (1 - t) + to * t;
}
