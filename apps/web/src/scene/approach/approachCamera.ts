import type { CloseApproach } from '@perihelion/data';
import { type Vector3, dot, norm } from '@perihelion/orbit';
import { crossingDays } from './approachTiming';

/** The clock starts 3τ before closest approach and ±3τ plays in 12 s: grazing and distant passes read alike. */
export const LEAD_CROSSINGS = 3;
export const PASS_SECONDS = 12;
/** Close enough that the asteroid's motion against Earth is obvious, far enough to see Earth beside it. */
export const FOLLOW_DISTANCE_FRACTION = 0.6;
/** Looking straight down the Earth→asteroid line would hide Earth behind the asteroid; 20° shows both. */
export const CHASE_ELEVATION_RAD = (20 * Math.PI) / 180;
/** Below this the line is within ~0.06° of the pass normal, and "toward the normal" has no direction. */
const MIN_TILT_PERPENDICULAR = 1e-3;
/** Below this sine the two directions are (nearly) equal or opposite, and have no unique arc between them. */
const MIN_BLEND_SINE = 1e-9;

const scratchAway: Vector3 = [0, 0, 0];
const scratchTilt: Vector3 = [0, 0, 0];

type Pass = Pick<CloseApproach, 'approachJdTdb' | 'distanceAu' | 'relativeVelocityKmPerS'>;

export interface ApproachPlayback {
  startJdTdb: number;
  rateDaysPerSecond: number;
}

export interface DirectionBlend {
  fromDirection: Readonly<Vector3>;
  toDirection: Readonly<Vector3>;
  eased: number;
}

export function approachPlayback(approach: Pass): ApproachPlayback {
  const tau = crossingDays(approach);
  return {
    startJdTdb: approach.approachJdTdb - LEAD_CROSSINGS * tau,
    rateDaysPerSecond: (2 * LEAD_CROSSINGS * tau) / PASS_SECONDS,
  };
}

export function followDistanceAu(approach: Pick<CloseApproach, 'distanceAu'>): number {
  return approach.distanceAu * FOLLOW_DISTANCE_FRACTION;
}

/**
 * From the asteroid toward the camera: away from Earth, tilted 20° toward the pass's plane normal. The normal is
 * fixed through a flyby, so the camera turns no faster than the line itself; a tilt toward ecliptic north swung it
 * ~100°/s where the line passed near the pole. Its component along the Earth→asteroid line is cos 20° > 0, so the
 * camera is always farther from Earth than the asteroid is.
 */
export function writeChaseDirection(
  geocentricOffsetAu: Readonly<Vector3>,
  passNormal: Readonly<Vector3>,
  out: Vector3,
): Vector3 {
  writeUnit(geocentricOffsetAu, scratchAway);
  writePerpendicularPart(passNormal, scratchAway, scratchTilt);
  const tiltLength = norm(scratchTilt);
  const canTilt = tiltLength >= MIN_TILT_PERPENDICULAR;
  const awayWeight = canTilt ? Math.cos(CHASE_ELEVATION_RAD) : 1;
  const tiltWeight = canTilt ? Math.sin(CHASE_ELEVATION_RAD) / tiltLength : 0;
  for (const axis of [0, 1, 2] as const) {
    out[axis] = awayWeight * scratchAway[axis] + tiltWeight * scratchTilt[axis];
  }
  return out;
}

/**
 * Slerp between unit directions: a constant turn rate, exact at both ends. A normalised lerp turns fastest midway,
 * ~22° in one frame between nearly opposite directions. Equal or opposite directions have no unique arc, so the
 * blend takes the target there.
 */
export function writeDirectionBlend(blend: DirectionBlend, out: Vector3): Vector3 {
  const { fromDirection, toDirection, eased } = blend;
  const angleRad = Math.acos(Math.min(Math.max(dot(fromDirection, toDirection), -1), 1));
  const sinAngle = Math.sin(angleRad);
  if (sinAngle < MIN_BLEND_SINE) {
    [out[0], out[1], out[2]] = toDirection;
    return out;
  }
  const fromWeight = Math.sin((1 - eased) * angleRad) / sinAngle;
  const toWeight = Math.sin(eased * angleRad) / sinAngle;
  for (const axis of [0, 1, 2] as const) {
    out[axis] = fromWeight * fromDirection[axis] + toWeight * toDirection[axis];
  }
  return writeUnit(out, out);
}

export function writeDifference(
  minuend: Readonly<Vector3>,
  subtrahend: Readonly<Vector3>,
  out: Vector3,
): Vector3 {
  for (const axis of [0, 1, 2] as const) out[axis] = minuend[axis] - subtrahend[axis];
  return out;
}

/** `out` may be `vector`: the length is taken before any component is written. */
export function writeUnit(vector: Readonly<Vector3>, out: Vector3): Vector3 {
  const length = norm(vector);
  for (const axis of [0, 1, 2] as const) out[axis] = vector[axis] / length;
  return out;
}

/** v − (v·û)û: the part of `vector` perpendicular to the unit line of sight. */
function writePerpendicularPart(
  vector: Readonly<Vector3>,
  unit: Readonly<Vector3>,
  out: Vector3,
): Vector3 {
  const along = dot(vector, unit);
  for (const axis of [0, 1, 2] as const) out[axis] = vector[axis] - along * unit[axis];
  return out;
}
