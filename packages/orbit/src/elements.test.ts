import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type OrbitalElements,
  type StateVector,
  GM_SUN_AU3_PER_DAY2,
  createStateVector,
  elementsFromState,
  perifocalBasis,
  stateFromElements,
} from './elements';
import { type Vector3, cross, dot, norm } from './vector3';

const TWO_PI = 2 * Math.PI;
const GAUSSIAN_K = 0.01720209895;
const J2000_JD_TDB = 2_451_545;

// A round trip is ~50 float64 operations (~1e-14 relative); these leave ~1000× headroom.
const RELATIVE_TOLERANCE = 1e-11;
const ANGLE_TOLERANCE_RAD = 1e-9;

const angleRad = fc.double({ min: 0, max: TWO_PI, noNaN: true });

function elementsArbitrary(shape: {
  eccentricity: fc.Arbitrary<number>;
  inclinationRad: fc.Arbitrary<number>;
}): fc.Arbitrary<OrbitalElements> {
  return fc.record({
    semiMajorAxisAu: fc.double({ min: 0.3, max: 50, noNaN: true }),
    eccentricity: shape.eccentricity,
    inclinationRad: shape.inclinationRad,
    longitudeOfAscendingNodeRad: angleRad,
    argumentOfPerihelionRad: angleRad,
    meanAnomalyRad: angleRad,
    epochJdTdb: fc.constant(J2000_JD_TDB),
  });
}

// Node and perihelion are undefined for e = 0 and i ∈ {0, π}; keep clear of them when
// comparing elements, and include them exactly when comparing states.
const wellDefinedElements = elementsArbitrary({
  eccentricity: fc.double({ min: 1e-3, max: 0.99, noNaN: true }),
  inclinationRad: fc.double({ min: 1e-3, max: Math.PI - 1e-3, noNaN: true }),
});
const anyBoundElements = elementsArbitrary({
  eccentricity: fc.oneof(fc.constant(0), fc.double({ min: 0, max: 0.99, noNaN: true })),
  inclinationRad: fc.oneof(
    fc.constantFrom(0, Math.PI),
    fc.double({ min: 0, max: Math.PI, noNaN: true }),
  ),
});

function circularEclipticElements(inclinationRad: number): OrbitalElements {
  return {
    semiMajorAxisAu: 1,
    eccentricity: 0,
    inclinationRad,
    longitudeOfAscendingNodeRad: 0,
    argumentOfPerihelionRad: 0,
    meanAnomalyRad: 0,
    epochJdTdb: J2000_JD_TDB,
  };
}

function stateAt(positionAu: Vector3, velocityAuPerDay: Vector3): StateVector {
  return { positionAu, velocityAuPerDay };
}

function angularDistanceRad(firstRad: number, secondRad: number): number {
  return Math.abs(Math.atan2(Math.sin(firstRad - secondRad), Math.cos(firstRad - secondRad)));
}

function relativeError(actual: Vector3, expected: Vector3): number {
  const [ax, ay, az] = actual;
  const [ex, ey, ez] = expected;
  return norm([ax - ex, ay - ey, az - ez]) / norm(expected);
}

describe('GM_SUN_AU3_PER_DAY2', () => {
  it('is the square of the Gaussian gravitational constant', () => {
    expect(GM_SUN_AU3_PER_DAY2).toBe(GAUSSIAN_K * GAUSSIAN_K);
  });
});

describe('createStateVector', () => {
  it('starts at rest at the origin', () => {
    expect(createStateVector()).toEqual(stateAt([0, 0, 0], [0, 0, 0]));
  });
});

describe('stateFromElements', () => {
  it('puts a circular ecliptic orbit at 1 AU moving at k AU/day', () => {
    const { positionAu, velocityAuPerDay } = stateFromElements(circularEclipticElements(0));
    expect(positionAu).toEqual([1, 0, 0]);
    expect(velocityAuPerDay[0]).toBeCloseTo(0, 15);
    expect(velocityAuPerDay[1]).toBeCloseTo(GAUSSIAN_K, 15);
    expect(velocityAuPerDay[2]).toBeCloseTo(0, 15);
  });

  it('runs a retrograde orbit clockwise', () => {
    const { velocityAuPerDay } = stateFromElements(circularEclipticElements(Math.PI));
    expect(velocityAuPerDay[1]).toBeCloseTo(-GAUSSIAN_K, 15);
  });

  it('writes into and returns the out argument', () => {
    const out = createStateVector();
    expect(stateFromElements(circularEclipticElements(0), out)).toBe(out);
    expect(out.positionAu).toEqual([1, 0, 0]);
  });

  it('puts perihelion at a(1 − e) and aphelion at a(1 + e)', () => {
    fc.assert(
      fc.property(anyBoundElements, (elements) => {
        const { semiMajorAxisAu: a, eccentricity: e } = elements;
        const perihelion = stateFromElements({ ...elements, meanAnomalyRad: 0 });
        const aphelion = stateFromElements({ ...elements, meanAnomalyRad: Math.PI });
        expect(norm(perihelion.positionAu) / (a * (1 - e))).toBeCloseTo(1, 11);
        expect(norm(aphelion.positionAu) / (a * (1 + e))).toBeCloseTo(1, 11);
      }),
    );
  });

  it('satisfies the vis-viva equation', () => {
    fc.assert(
      fc.property(anyBoundElements, (elements) => {
        const { positionAu, velocityAuPerDay } = stateFromElements(elements);
        const expectedSpeedSquared =
          GM_SUN_AU3_PER_DAY2 * (2 / norm(positionAu) - 1 / elements.semiMajorAxisAu);
        const speedSquared = dot(velocityAuPerDay, velocityAuPerDay);
        expect(speedSquared / expectedSpeedSquared).toBeCloseTo(1, 11);
      }),
    );
  });

  it('gives angular momentum √(μa(1 − e²)) tilted by the inclination', () => {
    fc.assert(
      fc.property(anyBoundElements, (elements) => {
        const { semiMajorAxisAu: a, eccentricity: e, inclinationRad } = elements;
        const { positionAu, velocityAuPerDay } = stateFromElements(elements);
        const angularMomentum = cross(positionAu, velocityAuPerDay);
        const expectedMagnitude = Math.sqrt(GM_SUN_AU3_PER_DAY2 * a * (1 - e * e));
        expect(norm(angularMomentum) / expectedMagnitude).toBeCloseTo(1, 11);
        expect(angularMomentum[2] / norm(angularMomentum)).toBeCloseTo(
          Math.cos(inclinationRad),
          11,
        );
      }),
    );
  });

  it('rejects unbound or degenerate elements', () => {
    const circular = circularEclipticElements(0);
    expect(() => stateFromElements({ ...circular, semiMajorAxisAu: 0 })).toThrow(RangeError);
    expect(() => stateFromElements({ ...circular, semiMajorAxisAu: -1 })).toThrow(RangeError);
    expect(() => stateFromElements({ ...circular, eccentricity: 1 })).toThrow(RangeError);
  });
});

describe('elementsFromState', () => {
  it('inverts stateFromElements wherever the elements are well defined', () => {
    fc.assert(
      fc.property(wellDefinedElements, (elements) => {
        const recovered = elementsFromState(stateFromElements(elements), elements.epochJdTdb);
        expect(recovered.semiMajorAxisAu / elements.semiMajorAxisAu).toBeCloseTo(1, 11);
        expect(Math.abs(recovered.eccentricity - elements.eccentricity)).toBeLessThan(1e-11);
        expect(recovered.epochJdTdb).toBe(elements.epochJdTdb);
        for (const angle of [
          'inclinationRad',
          'longitudeOfAscendingNodeRad',
          'argumentOfPerihelionRad',
          'meanAnomalyRad',
        ] as const) {
          expect(angularDistanceRad(recovered[angle], elements[angle])).toBeLessThan(
            ANGLE_TOLERANCE_RAD,
          );
        }
      }),
    );
  });

  it('round-trips the state for any bound orbit, circular and ecliptic included', () => {
    fc.assert(
      fc.property(anyBoundElements, (elements) => {
        const state = stateFromElements(elements);
        const roundTrip = stateFromElements(elementsFromState(state, elements.epochJdTdb));
        expect(relativeError(roundTrip.positionAu, state.positionAu)).toBeLessThan(
          RELATIVE_TOLERANCE,
        );
        expect(relativeError(roundTrip.velocityAuPerDay, state.velocityAuPerDay)).toBeLessThan(
          RELATIVE_TOLERANCE,
        );
      }),
    );
  });

  it('puts node and perihelion on the x axis for a circular ecliptic orbit', () => {
    const elements = elementsFromState(stateAt([1, 0, 0], [0, GAUSSIAN_K, 0]), J2000_JD_TDB);
    expect(elements.semiMajorAxisAu).toBeCloseTo(1, 12);
    expect(elements.eccentricity).toBeCloseTo(0, 12);
    expect(elements.inclinationRad).toBe(0);
    expect(elements.longitudeOfAscendingNodeRad).toBe(0);
    expect(elements.argumentOfPerihelionRad).toBe(0);
    expect(elements.meanAnomalyRad).toBe(0);
  });

  it('reports a clockwise ecliptic orbit as i = π', () => {
    const elements = elementsFromState(stateAt([1, 0, 0], [0, -GAUSSIAN_K, 0]), J2000_JD_TDB);
    expect(elements.inclinationRad).toBe(Math.PI);
  });

  it('rejects escape trajectories and radial motion', () => {
    const escaping = stateAt([1, 0, 0], [0, 1.5 * GAUSSIAN_K, 0]);
    const radial = stateAt([1, 0, 0], [0.001, 0, 0]);
    expect(() => elementsFromState(escaping, J2000_JD_TDB)).toThrow(RangeError);
    expect(() => elementsFromState(radial, J2000_JD_TDB)).toThrow(RangeError);
  });
});

describe('perifocalBasis', () => {
  const orientation = fc.record({
    inclinationRad: angleRad,
    longitudeOfAscendingNodeRad: angleRad,
    argumentOfPerihelionRad: angleRad,
  });

  it('returns two orthogonal unit vectors for any orientation', () => {
    fc.assert(
      fc.property(orientation, (angles) => {
        const { towardPerihelion, towardQuadrature } = perifocalBasis(angles);
        expect(norm(towardPerihelion)).toBeCloseTo(1, 12);
        expect(norm(towardQuadrature)).toBeCloseTo(1, 12);
        expect(dot(towardPerihelion, towardQuadrature)).toBeCloseTo(0, 12);
      }),
    );
  });

  it('points perihelion to ecliptic north for i = 90°, ω = 90°', () => {
    const { towardPerihelion } = perifocalBasis({
      inclinationRad: Math.PI / 2,
      longitudeOfAscendingNodeRad: 0,
      argumentOfPerihelionRad: Math.PI / 2,
    });
    [0, 0, 1].forEach((expected, axis) => expect(towardPerihelion[axis]).toBeCloseTo(expected, 12));
  });
});
