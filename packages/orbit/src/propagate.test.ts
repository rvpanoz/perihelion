import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type OrbitalElements,
  type StateVector,
  GM_SUN_AU3_PER_DAY2,
  createStateVector,
} from './elements';
import { meanMotionRadPerDay, propagateElements, stateAtTime } from './propagate';
import { type Vector3, cross, dot, norm } from './vector3';

const GAUSSIAN_K = 0.01720209895;
const J2000_JD_TDB = 2_451_545;
const TWO_PI = 2 * Math.PI;
const CENTURY_DAYS = 36_525;

// A propagation is ~100 float64 operations (~1e-14 relative); this leaves ~1000× headroom.
const RELATIVE_TOLERANCE = 1e-11;

// A float64 JD near 2.45e6 resolves ~4.7e-10 day, so an absolute time can be off by ~2.3e-10 day:
// ~4e-12 AU of motion at 1 AU. Tighter absolute-position checks would test float rounding, not us.
const JD_RESOLUTION_TOLERANCE_AU = 1e-11;

const angleRad = fc.double({ min: 0, max: TWO_PI, noNaN: true });
const boundElements: fc.Arbitrary<OrbitalElements> = fc.record({
  semiMajorAxisAu: fc.double({ min: 0.3, max: 50, noNaN: true }),
  eccentricity: fc.double({ min: 0, max: 0.99, noNaN: true }),
  inclinationRad: fc.double({ min: 0, max: Math.PI, noNaN: true }),
  longitudeOfAscendingNodeRad: angleRad,
  argumentOfPerihelionRad: angleRad,
  meanAnomalyRad: angleRad,
  epochJdTdb: fc.constant(J2000_JD_TDB),
});
const elapsedDays = fc.double({ min: -CENTURY_DAYS, max: CENTURY_DAYS, noNaN: true });

const circularOneAu: OrbitalElements = {
  semiMajorAxisAu: 1,
  eccentricity: 0,
  inclinationRad: 0,
  longitudeOfAscendingNodeRad: 0,
  argumentOfPerihelionRad: 0,
  meanAnomalyRad: 0,
  epochJdTdb: J2000_JD_TDB,
};

function periodDays(elements: OrbitalElements): number {
  return TWO_PI / meanMotionRadPerDay(elements.semiMajorAxisAu);
}

function specificEnergy({ positionAu, velocityAuPerDay }: StateVector): number {
  return dot(velocityAuPerDay, velocityAuPerDay) / 2 - GM_SUN_AU3_PER_DAY2 / norm(positionAu);
}

/** Laplace–Runge–Lenz vector over μ, e = (v × h)/μ − r/|r|: points at perihelion, length e. */
function eccentricityVector({ positionAu, velocityAuPerDay }: StateVector): Vector3 {
  const [cx, cy, cz] = cross(velocityAuPerDay, cross(positionAu, velocityAuPerDay));
  const [x, y, z] = positionAu;
  const radiusAu = norm(positionAu);
  const mu = GM_SUN_AU3_PER_DAY2;
  return [cx / mu - x / radiusAu, cy / mu - y / radiusAu, cz / mu - z / radiusAu];
}

function difference(first: Vector3, second: Vector3): Vector3 {
  return [first[0] - second[0], first[1] - second[1], first[2] - second[2]];
}

describe('meanMotionRadPerDay', () => {
  it('is k rad/day at 1 AU, one Gaussian year per orbit', () => {
    expect(meanMotionRadPerDay(1)).toBeCloseTo(GAUSSIAN_K, 15);
    expect(periodDays(circularOneAu)).toBeCloseTo(365.2568983, 6);
  });

  it('follows Kepler’s third law, n²a³ = μ', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.01, max: 1e3, noNaN: true }), (semiMajorAxisAu) => {
        const meanMotion = meanMotionRadPerDay(semiMajorAxisAu);
        const ratio = (meanMotion ** 2 * semiMajorAxisAu ** 3) / GM_SUN_AU3_PER_DAY2;
        expect(ratio).toBeCloseTo(1, 12);
      }),
    );
  });

  it.each([0, -1, Number.NaN])('rejects semi-major axis %d', (semiMajorAxisAu) => {
    expect(() => meanMotionRadPerDay(semiMajorAxisAu)).toThrow(RangeError);
  });
});

describe('propagateElements', () => {
  it('changes only the mean anomaly and the epoch', () => {
    fc.assert(
      fc.property(boundElements, elapsedDays, (elements, days) => {
        const propagated = propagateElements(elements, elements.epochJdTdb + days);
        expect(propagated).toEqual({
          ...elements,
          meanAnomalyRad: propagated.meanAnomalyRad,
          epochJdTdb: propagated.epochJdTdb,
        });
        expect(propagated.epochJdTdb).toBe(elements.epochJdTdb + days);
      }),
    );
  });

  it('comes back to the same mean anomaly after one period', () => {
    fc.assert(
      fc.property(boundElements, (elements) => {
        const later = propagateElements(elements, elements.epochJdTdb + periodDays(elements));
        const driftRad = later.meanAnomalyRad - elements.meanAnomalyRad;
        expect(Math.abs(Math.sin(driftRad))).toBeLessThan(1e-9);
        expect(Math.cos(driftRad)).toBeCloseTo(1, 12);
      }),
    );
  });
});

describe('stateAtTime', () => {
  it('turns a circular 1 AU orbit a quarter turn counter-clockwise in a quarter year', () => {
    const { positionAu } = stateAtTime(circularOneAu, J2000_JD_TDB + periodDays(circularOneAu) / 4);
    expect(norm(difference(positionAu, [0, 1, 0]))).toBeLessThan(JD_RESOLUTION_TOLERANCE_AU);
  });

  it('writes into and returns the out argument', () => {
    const out = createStateVector();
    expect(stateAtTime(circularOneAu, J2000_JD_TDB, out)).toBe(out);
    expect(out.positionAu).toEqual([1, 0, 0]);
  });

  it('conserves specific orbital energy', () => {
    fc.assert(
      fc.property(boundElements, elapsedDays, (elements, days) => {
        const initial = specificEnergy(stateAtTime(elements, elements.epochJdTdb));
        const later = specificEnergy(stateAtTime(elements, elements.epochJdTdb + days));
        expect(Math.abs(later / initial - 1)).toBeLessThan(RELATIVE_TOLERANCE);
      }),
    );
  });

  it('conserves the angular momentum vector', () => {
    fc.assert(
      fc.property(boundElements, elapsedDays, (elements, days) => {
        const angularMomentum = ({ positionAu, velocityAuPerDay }: StateVector) =>
          cross(positionAu, velocityAuPerDay);
        const initial = angularMomentum(stateAtTime(elements, elements.epochJdTdb));
        const later = angularMomentum(stateAtTime(elements, elements.epochJdTdb + days));
        expect(norm(difference(later, initial)) / norm(initial)).toBeLessThan(RELATIVE_TOLERANCE);
      }),
    );
  });

  it('keeps perihelion fixed in space (conserves the eccentricity vector)', () => {
    fc.assert(
      fc.property(boundElements, elapsedDays, (elements, days) => {
        const initial = eccentricityVector(stateAtTime(elements, elements.epochJdTdb));
        const later = eccentricityVector(stateAtTime(elements, elements.epochJdTdb + days));
        expect(norm(difference(later, initial))).toBeLessThan(1e-10);
      }),
    );
  });

  // Conservation alone would also pass if time ran backwards; this pins the direction and rate.
  it('has velocity equal to the time derivative of position', () => {
    fc.assert(
      fc.property(boundElements, elapsedDays, (elements, days) => {
        // Central difference, truncation ~(step/τ)² with τ the fastest local timescale (~1e-7 here).
        const stepDays = periodDays(elements) * 1e-7;
        const atJdTdb = elements.epochJdTdb + days;
        // Divide by the step as stored: rounding t ± h to float64 JDs changes it by up to ~5e-10 day.
        const beforeJdTdb = atJdTdb - stepDays;
        const afterJdTdb = atJdTdb + stepDays;
        const before = stateAtTime(elements, beforeJdTdb).positionAu;
        const after = stateAtTime(elements, afterJdTdb).positionAu;
        const [dx, dy, dz] = difference(after, before);
        const storedStepDays = afterJdTdb - beforeJdTdb;
        const estimated: Vector3 = [dx / storedStepDays, dy / storedStepDays, dz / storedStepDays];
        const { velocityAuPerDay } = stateAtTime(elements, atJdTdb);
        const error = norm(difference(estimated, velocityAuPerDay)) / norm(velocityAuPerDay);
        expect(error).toBeLessThan(1e-5);
      }),
    );
  });
});
