import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { meanAnomalyFromEccentric, solveKepler } from './kepler';

const RAD_PER_DEG = Math.PI / 180;
const TWO_PI = 2 * Math.PI;
/** The accuracy the solver promises; also the slack for ordering checks. */
const SOLVER_ACCURACY_RAD = 1e-12;

const ellipticEccentricity = fc.double({ min: 0, max: 0.99, noNaN: true });
const meanAnomalyRad = fc.double({ min: -20 * Math.PI, max: 20 * Math.PI, noNaN: true });

describe('solveKepler', () => {
  // Meeus, Astronomical Algorithms (2nd ed.), examples 30.a and 30.b.
  it.each([
    [5, 0.1, 5.554589],
    [2, 0.99, 32.361007],
  ])('solves M = %d° with e = %d (Meeus)', (meanDeg, eccentricity, expectedDeg) => {
    const eccentricAnomalyRad = solveKepler(meanDeg * RAD_PER_DEG, eccentricity);
    expect(eccentricAnomalyRad / RAD_PER_DEG).toBeCloseTo(expectedDeg, 5);
  });

  it('returns M itself for a circular orbit', () => {
    expect(solveKepler(1.234, 0)).toBeCloseTo(1.234, 15);
  });

  it('fixes perihelion and aphelion', () => {
    expect(solveKepler(0, 0.9)).toBe(0);
    expect(solveKepler(Math.PI, 0.9)).toBeCloseTo(Math.PI, 14);
  });

  it('satisfies E − e·sin E = M to 1e-12 for e in [0, 0.99]', () => {
    fc.assert(
      fc.property(meanAnomalyRad, ellipticEccentricity, (meanRad, eccentricity) => {
        const eccentricAnomalyRad = solveKepler(meanRad, eccentricity);
        const residualRad = meanAnomalyFromEccentric(eccentricAnomalyRad, eccentricity) - meanRad;
        expect(Math.abs(residualRad)).toBeLessThanOrEqual(SOLVER_ACCURACY_RAD);
      }),
    );
  });

  it('converges for extreme eccentricity near perihelion', () => {
    const eccentricAnomalyRad = solveKepler(1e-4, 0.999_999);
    expect(meanAnomalyFromEccentric(eccentricAnomalyRad, 0.999_999)).toBeCloseTo(1e-4, 12);
  });

  it('is odd in M and advances by 2π per revolution', () => {
    fc.assert(
      fc.property(meanAnomalyRad, ellipticEccentricity, (meanRad, eccentricity) => {
        const eccentricAnomalyRad = solveKepler(meanRad, eccentricity);
        expect(solveKepler(-meanRad, eccentricity)).toBeCloseTo(-eccentricAnomalyRad, 10);
        expect(solveKepler(meanRad + TWO_PI, eccentricity)).toBeCloseTo(
          eccentricAnomalyRad + TWO_PI,
          10,
        );
      }),
    );
  });

  // Exact ordering is out of reach in float64: M = 0 and M = 5e-324 once gave E = 0 and E = −6e-27,
  // both within tolerance. So ordering is checked to the solver's stated accuracy.
  it('never decreases as M increases, to within the solver accuracy', () => {
    fc.assert(
      fc.property(meanAnomalyRad, meanAnomalyRad, ellipticEccentricity, (first, second, e) => {
        const [lowerRad, higherRad] = first <= second ? [first, second] : [second, first];
        expect(solveKepler(lowerRad, e)).toBeLessThanOrEqual(
          solveKepler(higherRad, e) + SOLVER_ACCURACY_RAD,
        );
      }),
    );
  });

  it.each([-0.1, 1, 1.5, Number.NaN])('rejects non-elliptic eccentricity %d', (eccentricity) => {
    expect(() => solveKepler(1, eccentricity)).toThrow(RangeError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejects mean anomaly %d', (meanRad) => {
    expect(() => solveKepler(meanRad, 0.5)).toThrow(RangeError);
  });
});

describe('meanAnomalyFromEccentric', () => {
  it('evaluates Kepler’s equation', () => {
    expect(meanAnomalyFromEccentric(Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 2 - 0.5, 15);
  });

  it('is inverted by solveKepler', () => {
    const eccentricAnomalyRad = fc.double({ min: -Math.PI, max: Math.PI, noNaN: true });
    fc.assert(
      fc.property(eccentricAnomalyRad, ellipticEccentricity, (anomalyRad, eccentricity) => {
        const meanRad = meanAnomalyFromEccentric(anomalyRad, eccentricity);
        expect(solveKepler(meanRad, eccentricity)).toBeCloseTo(anomalyRad, 10);
      }),
    );
  });
});
