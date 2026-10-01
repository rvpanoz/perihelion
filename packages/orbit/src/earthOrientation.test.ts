import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { earthBodyAxesEcliptic, earthRotationAngleRad } from './earthOrientation';
import { OBLIQUITY_J2000_RAD, equatorialToEcliptic } from './heliographic';
import { cross, dot, norm } from './vector3';

const RAD_PER_DEG = Math.PI / 180;
/** One sidereal day in UT1 days: the ERA's rate is 1.00273781191135448 turns per day (written as 1 + a float64 part). */
const SIDEREAL_DAY = 1 / (1 + 0.002_737_811_911_354_48);
const jdUt1 = fc.double({ min: 2_440_000, max: 2_470_000, noNaN: true });

describe('earthRotationAngleRad', () => {
  it('is 280.46061837504° at J2000.0, the constant of IAU 2000 B1.8', () => {
    expect(earthRotationAngleRad(2_451_545.0) / RAD_PER_DEG).toBeCloseTo(280.460_618_375_04, 9);
  });

  it('returns to the same angle after one sidereal day', () => {
    fc.assert(
      fc.property(jdUt1, (jd) => {
        const difference = earthRotationAngleRad(jd + SIDEREAL_DAY) - earthRotationAngleRad(jd);
        const wrapped = Math.atan2(Math.sin(difference), Math.cos(difference));
        expect(Math.abs(wrapped)).toBeLessThan(1e-7);
      }),
    );
  });

  it('stays in [0, 2π)', () => {
    fc.assert(
      fc.property(jdUt1, (jd) => {
        const angle = earthRotationAngleRad(jd);
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(2 * Math.PI);
      }),
    );
  });
});

describe('earthBodyAxesEcliptic', () => {
  it('is a right-handed orthonormal frame with the pole tilted by the obliquity', () => {
    fc.assert(
      fc.property(jdUt1, (jd) => {
        const { greenwich, east, pole } = earthBodyAxesEcliptic(jd);
        for (const axis of [greenwich, east, pole]) expect(norm(axis)).toBeCloseTo(1, 14);
        expect(dot(greenwich, east)).toBeCloseTo(0, 14);
        expect(dot(greenwich, pole)).toBeCloseTo(0, 14);
        const handedness = cross(greenwich, east);
        for (const index of [0, 1, 2] as const)
          expect(handedness[index]).toBeCloseTo(pole[index], 14);
        expect(Math.acos(pole[2])).toBeCloseTo(OBLIQUITY_J2000_RAD, 14);
      }),
    );
  });
});

describe('equatorialToEcliptic', () => {
  it('keeps the equinox and tilts the celestial pole toward ecliptic +y by the obliquity', () => {
    expect(equatorialToEcliptic([1, 0, 0])).toEqual([1, 0, 0]);
    const [x, y, z] = equatorialToEcliptic([0, 0, 1]);
    expect(x).toBe(0);
    expect(y).toBeCloseTo(Math.sin(OBLIQUITY_J2000_RAD), 15);
    expect(z).toBeCloseTo(Math.cos(OBLIQUITY_J2000_RAD), 15);
  });
});
