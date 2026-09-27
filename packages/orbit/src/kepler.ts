/** Kepler's equation for elliptic orbits: M = E − e·sin E. Angles in radians. */

const TWO_PI = 2 * Math.PI;
const MAX_ITERATIONS = 100;

/**
 * Well inside the 1e-12 the tests demand, yet above float64 rounding of the residual (~1e-15),
 * so Newton stops as soon as it can do no better.
 */
const RESIDUAL_TOLERANCE_RAD = 1e-14;

/** Kepler's equation evaluated forwards. */
export function meanAnomalyFromEccentric(
  eccentricAnomalyRad: number,
  eccentricity: number,
): number {
  return eccentricAnomalyRad - eccentricity * Math.sin(eccentricAnomalyRad);
}

/**
 * Eccentric anomaly E for mean anomaly M, in the same revolution as M.
 * Hyperbolic and parabolic orbits (e ≥ 1) are rejected: comets are out of scope for v1.
 */
export function solveKepler(meanAnomalyRad: number, eccentricity: number): number {
  assertSolvable(meanAnomalyRad, eccentricity);
  const revolutions = Math.round(meanAnomalyRad / TWO_PI);
  const reducedMeanAnomalyRad = meanAnomalyRad - revolutions * TWO_PI;
  return solveReducedKepler(reducedMeanAnomalyRad, eccentricity) + revolutions * TWO_PI;
}

function assertSolvable(meanAnomalyRad: number, eccentricity: number): void {
  if (!(eccentricity >= 0 && eccentricity < 1)) {
    throw new RangeError(
      `Kepler solver needs an elliptic orbit (0 ≤ e < 1), got e = ${eccentricity}.`,
    );
  }
  if (!Number.isFinite(meanAnomalyRad)) {
    throw new RangeError(`Mean anomaly must be finite, got ${meanAnomalyRad}.`);
  }
}

/**
 * Newton's method safeguarded by bisection (Numerical Recipes, 3rd ed., §9.4 "rtsafe"). For
 * |M| ≤ π the root lies in [−π, π], since E − e·sin E is increasing and maps that interval onto
 * itself; any Newton step that leaves the shrinking bracket is replaced by a bisection, so the
 * solver converges for every e < 1, including the high-e cases where plain Newton can oscillate.
 */
function solveReducedKepler(meanAnomalyRad: number, eccentricity: number): number {
  let lowRad = -Math.PI;
  let highRad = Math.PI;
  let eccentricAnomalyRad = danbyStartingGuess(meanAnomalyRad, eccentricity);
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const residualRad =
      meanAnomalyFromEccentric(eccentricAnomalyRad, eccentricity) - meanAnomalyRad;
    if (Math.abs(residualRad) <= RESIDUAL_TOLERANCE_RAD) break;
    if (residualRad > 0) highRad = eccentricAnomalyRad;
    else lowRad = eccentricAnomalyRad;
    const slope = 1 - eccentricity * Math.cos(eccentricAnomalyRad);
    const newtonRad = eccentricAnomalyRad - residualRad / slope;
    const isInsideBracket = newtonRad > lowRad && newtonRad < highRad;
    eccentricAnomalyRad = isInsideBracket ? newtonRad : (lowRad + highRad) / 2;
  }
  return eccentricAnomalyRad;
}

/**
 * E₀ = M + 0.85·e·sign(sin M) (Danby, Fundamentals of Celestial Mechanics, 2nd ed., §6.6),
 * clamped to the bracket. Close enough that Newton usually needs only a few steps.
 */
function danbyStartingGuess(meanAnomalyRad: number, eccentricity: number): number {
  const guessRad = meanAnomalyRad + 0.85 * eccentricity * Math.sign(meanAnomalyRad);
  return Math.min(Math.max(guessRad, -Math.PI), Math.PI);
}
