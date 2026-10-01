import type { Vector3 } from '@perihelion/orbit';

// Scene space is three.js Y-up; the engine's heliocentric ecliptic J2000 is Z-up. Ecliptic (x, y, z) maps to
// scene (x, z, −y): a rotation of −90° about x, so the frame stays right-handed and ecliptic north is
// screen-up. `writeSceneOffset` and `sceneAxesFromEcliptic` are the only places that apply it. The negated axis
// is written as a subtraction because unary minus turns 0 into −0.

/** Anything shaped like three.js `Vector3.set`, so hot paths write straight into an object's position. */
export interface SceneVectorTarget {
  set(x: number, y: number, z: number): unknown;
}

/** The float64 heliocentric point drawn at the scene origin: the camera's focus. */
const sceneOriginAu: Vector3 = [0, 0, 0];

export function setSceneOrigin(positionAu: Readonly<Vector3>): void {
  sceneOriginAu[0] = positionAu[0];
  sceneOriginAu[1] = positionAu[1];
  sceneOriginAu[2] = positionAu[2];
}

export function sceneOrigin(): Readonly<Vector3> {
  return sceneOriginAu;
}

/**
 * Writes `positionAu − origin` in scene axes. The subtraction happens in float64, before three.js hands the
 * value to float32 GPU buffers, so objects near the focus keep sub-metre precision even 30 AU from the Sun.
 */
export function writeSceneOffset<T extends SceneVectorTarget>(
  positionAu: Readonly<Vector3>,
  out: T,
): T {
  const [originX, originY, originZ] = sceneOriginAu;
  out.set(positionAu[0] - originX, positionAu[2] - originZ, originY - positionAu[1]);
  return out;
}

/** `out` may be the input: every component is read before any is written. */
export function sceneAxesFromEcliptic(
  eclipticAu: Readonly<Vector3>,
  out: Vector3 = [0, 0, 0],
): Vector3 {
  const [x, y, z] = eclipticAu;
  out[0] = x;
  out[1] = z;
  out[2] = 0 - y;
  return out;
}
