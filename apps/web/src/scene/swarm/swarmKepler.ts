import type { Vector3 } from '@perihelion/orbit';
import { type SwarmAttributes, columnValue } from './swarmAttributes';

// Float32 port of swarmKepler.glsl, statement for statement: each statement's result is rounded to float32,
// as the GPU stores it. Change both files together; the GLSL has the derivations.

const float32 = Math.fround;

const SWARM_PI = float32(Math.PI);
const SWARM_TWO_PI = float32(2 * Math.PI);
export const SWARM_NEWTON_STEPS = 6;
export const SWARM_TRAIL_SAMPLES = 8;
export const SWARM_TRAIL_SPANS_PER_ORBIT = 24;

/** One NEO's instanced attributes, as the vertex shader receives them. */
export interface SwarmOrbit {
  motion: Readonly<Vector3>;
  perihelionAxisAu: Readonly<Vector3>;
  minorAxisAu: Readonly<Vector3>;
}

export function swarmOrbitAt(attributes: SwarmAttributes, index: number): SwarmOrbit {
  return {
    motion: vectorAt(attributes.motion, index),
    perihelionAxisAu: vectorAt(attributes.perihelionAxisAu, index),
    minorAxisAu: vectorAt(attributes.minorAxisAu, index),
  };
}

const VECTOR3_LENGTH = 3;

function vectorAt(values: Float32Array, index: number): Vector3 {
  const start = index * VECTOR3_LENGTH;
  return [
    columnValue(values, start),
    columnValue(values, start + 1),
    columnValue(values, start + 2),
  ];
}

function swarmCentredAnomaly(meanAnomalyRad: number): number {
  return meanAnomalyRad >= SWARM_PI ? float32(meanAnomalyRad - SWARM_TWO_PI) : meanAnomalyRad;
}

/** Mikkola's cubic starting value; see swarmKepler.glsl for the source and the derivation. */
function swarmKeplerStart(meanAnomalyRad: number, eccentricity: number): number {
  const denominator = float32(4 * eccentricity + 0.5);
  const alpha = float32((1 - eccentricity) / denominator);
  const beta = float32((0.5 * meanAnomalyRad) / denominator);
  const direction = beta < 0 ? -1 : 1;
  const cubeRoot = float32(
    direction * Math.cbrt(Math.abs(beta) + Math.sqrt(beta * beta + alpha ** 3)),
  );
  const sinThirdAnomaly = float32(cubeRoot - alpha / cubeRoot);
  const corrected = float32(sinThirdAnomaly - (0.078 * sinThirdAnomaly ** 5) / (1 + eccentricity));
  return float32(meanAnomalyRad + eccentricity * corrected * (3 - 4 * corrected * corrected));
}

export function swarmEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
  const centredRad = swarmCentredAnomaly(meanAnomalyRad);
  let eccentricAnomalyRad = swarmKeplerStart(centredRad, eccentricity);
  for (let step = 0; step < SWARM_NEWTON_STEPS; step += 1) {
    const sine = float32(Math.sin(eccentricAnomalyRad));
    const residualRad = float32(eccentricAnomalyRad - eccentricity * sine - centredRad);
    const slope = float32(1 - eccentricity * float32(Math.cos(eccentricAnomalyRad)));
    eccentricAnomalyRad = float32(eccentricAnomalyRad - residualRad / slope);
  }
  return eccentricAnomalyRad;
}

/** Sun-centred position in scene axes (AU). Pass `out` on hot paths to avoid allocating. */
export function swarmHeliocentricPosition(
  orbit: SwarmOrbit,
  elapsedDays: number,
  out: Vector3 = [0, 0, 0],
): Vector3 {
  const [eccentricity, meanAnomalyAtReferenceRad, meanMotionRadPerDay] = orbit.motion;
  const advancedRad = float32(
    meanAnomalyAtReferenceRad + meanMotionRadPerDay * float32(elapsedDays),
  );
  const eccentricAnomalyRad = swarmEccentricAnomaly(
    glslMod(advancedRad, SWARM_TWO_PI),
    eccentricity,
  );
  const alongMajor = float32(float32(Math.cos(eccentricAnomalyRad)) - eccentricity);
  const alongMinor = float32(Math.sin(eccentricAnomalyRad));
  for (const axis of [0, 1, 2] as const) {
    out[axis] = float32(
      alongMajor * orbit.perihelionAxisAu[axis] + alongMinor * orbit.minorAxisAu[axis],
    );
  }
  return out;
}

/** Days behind the head for trail vertex `trailStep` (0 at the head, 8 at the tail); see swarmKepler.glsl. */
export function swarmTrailLagDays(meanMotionRadPerDay: number, trailStep: number): number {
  const periodDays = float32(SWARM_TWO_PI / meanMotionRadPerDay);
  return float32(
    (float32(trailStep / SWARM_TRAIL_SAMPLES) * periodDays) / SWARM_TRAIL_SPANS_PER_ORBIT,
  );
}

/** GLSL's mod(x, y) = x − y·floor(x/y), which unlike `%` is never negative for positive y. */
function glslMod(value: number, divisor: number): number {
  return float32(value - divisor * Math.floor(float32(value / divisor)));
}
