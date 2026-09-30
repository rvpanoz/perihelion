import { NEO_ORBIT_CLASSES } from '@perihelion/data';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  MAX_SWARM_ECCENTRICITY,
  UNKNOWN_ABSOLUTE_MAGNITUDE,
  buildSwarmAttributes,
  neoElementsAt,
} from './swarmAttributes';
import { J2000_JD_TDB, catalogOf, expectCloseTo } from './swarmTestSupport';

const GAUSSIAN_K_RAD_PER_DAY = 0.01720209895;
const FLOAT32_DIGITS = 6;

describe('neoElementsAt', () => {
  it('converts the catalog’s degrees to radians and keeps the epoch', () => {
    const catalog = catalogOf({
      inclinationDeg: [90],
      longitudeOfAscendingNodeDeg: [180],
      argumentOfPerihelionDeg: [45],
      meanAnomalyDeg: [270],
    });
    expect(neoElementsAt(catalog, 0)).toEqual({
      semiMajorAxisAu: 1.5,
      eccentricity: 0.2,
      inclinationRad: expect.closeTo(Math.PI / 2, 12),
      longitudeOfAscendingNodeRad: expect.closeTo(Math.PI, 12),
      argumentOfPerihelionRad: expect.closeTo(Math.PI / 4, 12),
      meanAnomalyRad: expect.closeTo(1.5 * Math.PI, 12),
      epochJdTdb: J2000_JD_TDB,
    });
  });

  it('throws when a column is shorter than `count`', () => {
    expect(() => neoElementsAt(catalogOf({ count: 2 }), 1)).toThrow(RangeError);
  });
});

describe('buildSwarmAttributes', () => {
  it('lays out 3 + 3 + 3 + 2 floats per NEO', () => {
    const attributes = buildSwarmAttributes(catalogOf(), J2000_JD_TDB);
    expect(attributes.count).toBe(1);
    expect(attributes.referenceJdTdb).toBe(J2000_JD_TDB);
    expect(attributes.motion).toHaveLength(3);
    expect(attributes.perihelionAxisAu).toHaveLength(3);
    expect(attributes.minorAxisAu).toHaveLength(3);
    expect(attributes.appearance).toHaveLength(2);
  });

  it('advances the mean anomaly from the NEO epoch to the reference epoch at n = k / a^1.5', () => {
    const catalog = catalogOf({ semiMajorAxisAu: [1] });
    const { motion } = buildSwarmAttributes(catalog, J2000_JD_TDB + 10);
    expectCloseTo(motion, [0.2, 10 * GAUSSIAN_K_RAD_PER_DAY, GAUSSIAN_K_RAD_PER_DAY]);
  });

  it('keeps the mean anomaly in [0, 2π) for any epoch offset', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 360, noNaN: true }),
        fc.double({ min: -100_000, max: 100_000, noNaN: true }),
        (meanAnomalyDeg, offsetDays) => {
          const catalog = catalogOf({ meanAnomalyDeg: [meanAnomalyDeg] });
          const [, meanAnomalyRad] = buildSwarmAttributes(
            catalog,
            J2000_JD_TDB + offsetDays,
          ).motion;
          expect(meanAnomalyRad).toBeGreaterThanOrEqual(0);
          expect(meanAnomalyRad).toBeLessThanOrEqual(Math.fround(2 * Math.PI));
        },
      ),
    );
  });

  it('clamps the eccentricity and shortens the minor axis to match', () => {
    const catalog = catalogOf({ eccentricity: [0.999], semiMajorAxisAu: [2] });
    const { motion, minorAxisAu } = buildSwarmAttributes(catalog, J2000_JD_TDB);
    expect(motion[0]).toBeCloseTo(MAX_SWARM_ECCENTRICITY, FLOAT32_DIGITS);
    expectCloseTo(minorAxisAu, [0, 0, -2 * Math.sqrt(1 - MAX_SWARM_ECCENTRICITY ** 2)]);
  });

  it('puts perihelion on scene +x and the motion on scene −z for Ω = ω = i = 0', () => {
    // Scene axes are ecliptic (x, z, −y): perihelion on ecliptic +x, motion towards ecliptic +y.
    const { perihelionAxisAu, minorAxisAu } = buildSwarmAttributes(catalogOf(), J2000_JD_TDB);
    expectCloseTo(perihelionAxisAu, [1.5, 0, 0]);
    expectCloseTo(minorAxisAu, [0, 0, -1.5 * Math.sqrt(1 - 0.2 ** 2)]);
  });

  it('stores H, and the faintest H when SBDB gives none', () => {
    expect(buildSwarmAttributes(catalogOf(), J2000_JD_TDB).appearance[0]).toBe(11);
    const unknown = catalogOf({ absoluteMagnitude: [null] });
    expect(buildSwarmAttributes(unknown, J2000_JD_TDB).appearance[0]).toBe(
      UNKNOWN_ABSOLUTE_MAGNITUDE,
    );
  });

  it.each(NEO_ORBIT_CLASSES.map((orbitClass, index) => [orbitClass, index] as const))(
    'stores orbit class %s as index %i',
    (orbitClass, index) => {
      const catalog = catalogOf({ orbitClass: [orbitClass] });
      expect(buildSwarmAttributes(catalog, J2000_JD_TDB).appearance[1]).toBe(index);
    },
  );
});
