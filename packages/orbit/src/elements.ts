/**
 * Osculating orbital elements ↔ heliocentric state vectors, ecliptic J2000, two-body.
 * Formulas follow Murray & Dermott, Solar System Dynamics (1999), ch. 2.
 */

import { normalizeAngleRad } from './angles';
import { assertPositiveSemiMajorAxis } from './assertions';
import { meanAnomalyFromEccentric, solveKepler } from './kepler';
import { type Vector3, cross, dot, norm } from './vector3';

/** GM☉ = k², with k the Gaussian gravitational constant 0.01720209895 (IAU 1976), in AU³/day². */
export const GM_SUN_AU3_PER_DAY2 = 0.01720209895 * 0.01720209895;

/** Below these, perihelion or node is numerically undefined and we fall back to a convention. */
const CIRCULAR_ECCENTRICITY = 1e-11;
const ECLIPTIC_NODE_FRACTION = 1e-12;

export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationRad: number;
  longitudeOfAscendingNodeRad: number;
  argumentOfPerihelionRad: number;
  meanAnomalyRad: number;
  epochJdTdb: number;
}

export interface StateVector {
  positionAu: Vector3;
  velocityAuPerDay: Vector3;
}

export function createStateVector(): StateVector {
  return { positionAu: [0, 0, 0], velocityAuPerDay: [0, 0, 0] };
}

/** State at the elements' epoch. Pass `out` on hot paths to avoid allocating. */
export function stateFromElements(
  elements: OrbitalElements,
  out: StateVector = createStateVector(),
): StateVector {
  assertPositiveSemiMajorAxis(elements.semiMajorAxisAu);
  const eccentricAnomalyRad = solveKepler(elements.meanAnomalyRad, elements.eccentricity);
  const planar = perifocalState(elements, eccentricAnomalyRad);
  const { towardPerihelion: p, towardQuadrature: q } = perifocalBasis(elements);
  for (const axis of [0, 1, 2] as const) {
    out.positionAu[axis] = planar.xAu * p[axis] + planar.yAu * q[axis];
    out.velocityAuPerDay[axis] = planar.vxAuPerDay * p[axis] + planar.vyAuPerDay * q[axis];
  }
  return out;
}

/** In-plane state, x toward perihelion (Murray & Dermott eqs. 2.41 and 2.36 via Ė = na/r). */
function perifocalState(elements: OrbitalElements, eccentricAnomalyRad: number) {
  const { semiMajorAxisAu, eccentricity } = elements;
  const cosE = Math.cos(eccentricAnomalyRad);
  const sinE = Math.sin(eccentricAnomalyRad);
  const minorToMajorRatio = Math.sqrt(1 - eccentricity * eccentricity);
  const radiusAu = semiMajorAxisAu * (1 - eccentricity * cosE);
  const speedScale = Math.sqrt(GM_SUN_AU3_PER_DAY2 * semiMajorAxisAu) / radiusAu;
  return {
    xAu: semiMajorAxisAu * (cosE - eccentricity),
    yAu: semiMajorAxisAu * minorToMajorRatio * sinE,
    vxAuPerDay: -speedScale * sinE,
    vyAuPerDay: speedScale * minorToMajorRatio * cosE,
  };
}

/** Columns of R_z(Ω)·R_x(i)·R_z(ω) (Murray & Dermott eq. 2.122): perihelion and 90° ahead of it. */
export function perifocalBasis(
  elements: Pick<
    OrbitalElements,
    'inclinationRad' | 'longitudeOfAscendingNodeRad' | 'argumentOfPerihelionRad'
  >,
): { towardPerihelion: Vector3; towardQuadrature: Vector3 } {
  const cosNode = Math.cos(elements.longitudeOfAscendingNodeRad);
  const sinNode = Math.sin(elements.longitudeOfAscendingNodeRad);
  const cosPerihelion = Math.cos(elements.argumentOfPerihelionRad);
  const sinPerihelion = Math.sin(elements.argumentOfPerihelionRad);
  const cosInclination = Math.cos(elements.inclinationRad);
  const sinInclination = Math.sin(elements.inclinationRad);
  const towardPerihelion: Vector3 = [
    cosPerihelion * cosNode - sinPerihelion * sinNode * cosInclination,
    cosPerihelion * sinNode + sinPerihelion * cosNode * cosInclination,
    sinPerihelion * sinInclination,
  ];
  const towardQuadrature: Vector3 = [
    -sinPerihelion * cosNode - cosPerihelion * sinNode * cosInclination,
    -sinPerihelion * sinNode + cosPerihelion * cosNode * cosInclination,
    cosPerihelion * sinInclination,
  ];
  return { towardPerihelion, towardQuadrature };
}

/**
 * Elements for a heliocentric state at `epochJdTdb`. Conventions where elements are undefined:
 * an ecliptic orbit (i = 0 or π) has Ω = 0; a circular orbit has ω = 0, perihelion at the node.
 */
export function elementsFromState(state: StateVector, epochJdTdb: number): OrbitalElements {
  const angularMomentum = cross(state.positionAu, state.velocityAuPerDay);
  const shape = conicShape(state, angularMomentum);
  const plane = orbitPlane(angularMomentum);
  const argumentOfLatitudeRad = Math.atan2(
    dot(state.positionAu, plane.ninetyDegreesPastNode),
    dot(state.positionAu, plane.ascendingNode),
  );
  const isCircular = shape.eccentricity < CIRCULAR_ECCENTRICITY;
  const trueAnomalyRad = isCircular ? argumentOfLatitudeRad : shape.trueAnomalyRad;
  return {
    semiMajorAxisAu: shape.semiMajorAxisAu,
    eccentricity: shape.eccentricity,
    inclinationRad: plane.inclinationRad,
    longitudeOfAscendingNodeRad: plane.longitudeOfAscendingNodeRad,
    argumentOfPerihelionRad: normalizeAngleRad(argumentOfLatitudeRad - trueAnomalyRad),
    meanAnomalyRad: normalizeAngleRad(meanAnomalyFromTrue(trueAnomalyRad, shape.eccentricity)),
    epochJdTdb,
  };
}

/**
 * a from vis-viva; e·cos ν = h²/(μr) − 1 and e·sin ν = h·ṙ/μ from the orbit equation (Murray &
 * Dermott eqs. 2.20, 2.31–2.32). Unlike 1 − h²/(μa), neither loses precision as e → 0.
 */
function conicShape(state: StateVector, angularMomentum: Vector3) {
  const { positionAu, velocityAuPerDay } = state;
  const radiusAu = norm(positionAu);
  const angularMomentumMagnitude = norm(angularMomentum);
  const inverseSemiMajorAxis =
    2 / radiusAu - dot(velocityAuPerDay, velocityAuPerDay) / GM_SUN_AU3_PER_DAY2;
  if (!(inverseSemiMajorAxis > 0 && angularMomentumMagnitude > 0)) {
    throw new RangeError('State is not on a bound, non-radial (elliptic) orbit.');
  }
  const muTimesRadius = GM_SUN_AU3_PER_DAY2 * radiusAu;
  const eCosTrueAnomaly = angularMomentumMagnitude ** 2 / muTimesRadius - 1;
  const eSinTrueAnomaly =
    (angularMomentumMagnitude * dot(positionAu, velocityAuPerDay)) / muTimesRadius;
  return {
    semiMajorAxisAu: 1 / inverseSemiMajorAxis,
    eccentricity: Math.hypot(eCosTrueAnomaly, eSinTrueAnomaly),
    trueAnomalyRad: Math.atan2(eSinTrueAnomaly, eCosTrueAnomaly),
  };
}

/** Plane orientation from h. atan2 keeps i accurate near 0 and π, where acos is ill-conditioned. */
function orbitPlane(angularMomentum: Vector3) {
  const [hx, hy, hz] = angularMomentum;
  const magnitude = norm(angularMomentum);
  const nodeLength = Math.hypot(hx, hy);
  const isEcliptic = nodeLength <= ECLIPTIC_NODE_FRACTION * magnitude;
  const ascendingNode: Vector3 = isEcliptic ? [1, 0, 0] : [-hy / nodeLength, hx / nodeLength, 0];
  const normal: Vector3 = [hx / magnitude, hy / magnitude, hz / magnitude];
  return {
    inclinationRad: Math.atan2(nodeLength, hz),
    longitudeOfAscendingNodeRad: isEcliptic ? 0 : normalizeAngleRad(Math.atan2(hx, -hy)),
    ascendingNode,
    ninetyDegreesPastNode: cross(normal, ascendingNode),
  };
}

/** tan(E/2) = √((1−e)/(1+e))·tan(ν/2) (Murray & Dermott eq. 2.46), in atan2 form to keep the quadrant. */
function meanAnomalyFromTrue(trueAnomalyRad: number, eccentricity: number): number {
  const eccentricAnomalyRad = Math.atan2(
    Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(trueAnomalyRad),
    eccentricity + Math.cos(trueAnomalyRad),
  );
  return meanAnomalyFromEccentric(eccentricAnomalyRad, eccentricity);
}
