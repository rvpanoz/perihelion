import { type Vector3, cross, dot } from '@perihelion/orbit';
import { writeUnit } from '../approach/approachCamera';
import type { ShellSeed } from './cmeShellSeeds';

/** The cone's frame in scene axes: x and y span the cap, z is the axis. */
export interface ConeBasis {
  x: Vector3;
  y: Vector3;
  z: Vector3;
}

export interface ShellShape {
  basis: ConeBasis;
  cosHalfAngle: number;
  frontDistanceAu: number;
}

const SCENE_NORTH: Readonly<Vector3> = [0, 1, 0];
const SCENE_X: Readonly<Vector3> = [1, 0, 0];
/** Within ~8° of the pole, ecliptic north is too close to the axis to give a stable perpendicular. */
const MAX_NORTH_ALIGNMENT = 0.99;

/** Any orthonormal frame with z on the axis will do: the shell is symmetric about it. */
export function coneBasis(axisScene: Readonly<Vector3>): ConeBasis {
  const z = writeUnit(axisScene, [0, 0, 0]);
  const helper = Math.abs(dot(z, SCENE_NORTH)) > MAX_NORTH_ALIGNMENT ? SCENE_X : SCENE_NORTH;
  const x = writeUnit(cross(helper, z), [0, 0, 0]);
  return { x, y: cross(z, x), z };
}

/**
 * The CPU mirror of cmeShell.vert, for tests: DONKI's cone model, a cone from the Sun's centre capped by a sphere
 * about the Sun, so the leading edge is `frontDistanceAu` along the axis and every point of the cap is as far out;
 * particles behind the front (sheath, flanks) sit at a fraction of that distance.
 * Particles are spread evenly over the cap's area: cos θ = 1 − u (1 − cos α).
 */
export function shellParticleOffsetAu(seed: ShellSeed, shape: ShellShape, out: Vector3): Vector3 {
  const cosTheta = 1 - seed.capFraction * (1 - shape.cosHalfAngle);
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const along = [
    sinTheta * Math.cos(seed.azimuthRad),
    sinTheta * Math.sin(seed.azimuthRad),
    cosTheta,
  ] as const;
  const radiusAu = shape.frontDistanceAu * seed.radiusFraction;
  const { x, y, z } = shape.basis;
  for (const axis of [0, 1, 2] as const) {
    out[axis] = (along[0] * x[axis] + along[1] * y[axis] + along[2] * z[axis]) * radiusAu;
  }
  return out;
}
