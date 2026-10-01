import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type HeliographicDirection,
  SUN_POLE_ECLIPTIC_J2000,
  angleFromEarthRad,
  earthHeliographicLatitudeRad,
  heliographicToEcliptic,
  isEarthInsideCone,
} from './heliographic';
import { planetStateAt } from './planets';
import { julianDateFromCalendar } from './time';
import { type Vector3, cross, dot, norm } from './vector3';

const RAD_PER_DEG = Math.PI / 180;
const DAYS_IN_2026 = 365;
// Carrington's tilt of the solar equator to the ecliptic, and Hapgood (1992)'s ascending node at J2000
// (73.6667° + 0.013958° per year since 1850 → 75.76°): published constants the IAU pole must reproduce.
const SOLAR_EQUATOR_TILT_DEG = 7.25;
const ASCENDING_NODE_J2000_DEG = 75.76;
const PUBLISHED_CONSTANT_TOLERANCE_DEG = 0.01;

const latitude = fc.double({ min: -Math.PI / 2, max: Math.PI / 2, noNaN: true });
const longitude = fc.double({ min: -Math.PI, max: Math.PI, noNaN: true });
const direction = fc.record({ latitudeRad: latitude, longitudeRad: longitude });
/** Earth-like heliocentric positions: anywhere around the orbit, near the ecliptic, near 1 AU. */
const earthPosition = fc
  .record({
    longitudeRad: fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
    latitudeRad: fc.double({ min: -1e-4, max: 1e-4, noNaN: true }),
    distanceAu: fc.double({ min: 0.98, max: 1.02, noNaN: true }),
  })
  .map(({ longitudeRad, latitudeRad, distanceAu }): Vector3 => [
    distanceAu * Math.cos(latitudeRad) * Math.cos(longitudeRad),
    distanceAu * Math.cos(latitudeRad) * Math.sin(longitudeRad),
    distanceAu * Math.sin(latitudeRad),
  ]);

function expectSameVector(actual: Readonly<Vector3>, expected: Readonly<Vector3>): void {
  for (const axis of [0, 1, 2] as const) expect(actual[axis]).toBeCloseTo(expected[axis], 12);
}

function unit(vector: Readonly<Vector3>): Vector3 {
  const length = norm(vector);
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

describe('SUN_POLE_ECLIPTIC_J2000', () => {
  const [x, y, z] = SUN_POLE_ECLIPTIC_J2000;

  it('is a unit vector', () => {
    expect(norm(SUN_POLE_ECLIPTIC_J2000)).toBeCloseTo(1, 15);
  });

  it('sits at the published tilt and node: latitude 90° − 7.25°, longitude node − 90°', () => {
    const latitudeDeg = Math.asin(z) / RAD_PER_DEG;
    const longitudeDeg = (Math.atan2(y, x) / RAD_PER_DEG + 360) % 360;
    expect(Math.abs(latitudeDeg - (90 - SOLAR_EQUATOR_TILT_DEG))).toBeLessThan(
      PUBLISHED_CONSTANT_TOLERANCE_DEG,
    );
    expect(Math.abs(longitudeDeg - (ASCENDING_NODE_J2000_DEG - 90 + 360))).toBeLessThan(
      PUBLISHED_CONSTANT_TOLERANCE_DEG,
    );
  });
});

describe('heliographicToEcliptic', () => {
  it("maps heliographic latitude 90° to the Sun's pole", () => {
    fc.assert(
      fc.property(earthPosition, longitude, (earth, longitudeRad) => {
        const north = heliographicToEcliptic({ latitudeRad: Math.PI / 2, longitudeRad }, earth);
        expectSameVector(north, SUN_POLE_ECLIPTIC_J2000);
      }),
    );
  });

  it("maps Earth's own heliographic position, (B0, 0), to the Sun→Earth direction", () => {
    fc.assert(
      fc.property(earthPosition, (earth) => {
        const earthDirection = {
          latitudeRad: earthHeliographicLatitudeRad(earth),
          longitudeRad: 0,
        };
        expectSameVector(heliographicToEcliptic(earthDirection, earth), unit(earth));
      }),
    );
  });

  it('puts positive longitude on the solar west side, y = pole × x (Thompson 2006, §7)', () => {
    fc.assert(
      fc.property(earthPosition, (earth) => {
        const centralMeridian = heliographicToEcliptic({ latitudeRad: 0, longitudeRad: 0 }, earth);
        const west90 = heliographicToEcliptic({ latitudeRad: 0, longitudeRad: Math.PI / 2 }, earth);
        expectSameVector(west90, cross(SUN_POLE_ECLIPTIC_J2000, centralMeridian));
      }),
    );
  });

  it('returns unit vectors and preserves the angle between any two directions', () => {
    fc.assert(
      fc.property(earthPosition, direction, direction, (earth, first, second) => {
        const a = heliographicToEcliptic(first, earth);
        const b = heliographicToEcliptic(second, earth);
        // Spherical law of cosines between the two heliographic directions.
        const expectedCosine =
          Math.sin(first.latitudeRad) * Math.sin(second.latitudeRad) +
          Math.cos(first.latitudeRad) *
            Math.cos(second.latitudeRad) *
            Math.cos(first.longitudeRad - second.longitudeRad);
        expect(norm(a)).toBeCloseTo(1, 12);
        expect(dot(a, b)).toBeCloseTo(expectedCosine, 12);
      }),
    );
  });

  it('writes into and returns `out` when given one', () => {
    const out: Vector3 = [9, 9, 9];
    const result = heliographicToEcliptic({ latitudeRad: 0, longitudeRad: 0 }, [1, 0, 0], out);
    expect(result).toBe(out);
    expect(norm(out)).toBeCloseTo(1, 12);
  });
});

describe('earthHeliographicLatitudeRad', () => {
  // The IAU pole tilts the equator 7.2517° (Carrington's 7.25° rounded) and the EMB strays slightly off the
  // ecliptic, so the engine's B0 peaks at 7.2521° in 2026: bounded by the published tilt plus the same 0.01°
  // allowed for the published constants above (approved 2026-10-02).
  it("stays within the solar equator's 7.25° tilt for the engine's Earth on every day of 2026", () => {
    const firstDay = julianDateFromCalendar({
      year: 2026,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    });
    for (let day = 0; day < DAYS_IN_2026; day += 1) {
      const earth = planetStateAt('earthMoonBarycenter', firstDay + day).positionAu;
      expect(Math.abs(earthHeliographicLatitudeRad(earth))).toBeLessThanOrEqual(
        (SOLAR_EQUATOR_TILT_DEG + PUBLISHED_CONSTANT_TOLERANCE_DEG) * RAD_PER_DEG,
      );
    }
  });

  it('depends only on the direction to Earth, not the distance', () => {
    fc.assert(
      fc.property(earthPosition, (earth) => {
        const farther: Vector3 = [3 * earth[0], 3 * earth[1], 3 * earth[2]];
        expect(earthHeliographicLatitudeRad(farther)).toBeCloseTo(
          earthHeliographicLatitudeRad(earth),
          14,
        );
      }),
    );
  });
});

describe('angleFromEarthRad', () => {
  it("is zero along Earth's own heliographic direction", () => {
    fc.assert(
      fc.property(fc.double({ min: -0.13, max: 0.13, noNaN: true }), (earthLatitudeRad) => {
        const atEarth = { latitudeRad: earthLatitudeRad, longitudeRad: 0 };
        expect(angleFromEarthRad(atEarth, earthLatitudeRad)).toBeCloseTo(0, 15);
      }),
    );
  });

  it('equals the longitude on the equator when Earth is on it too', () => {
    fc.assert(
      fc.property(longitude, (longitudeRad) => {
        expect(angleFromEarthRad({ latitudeRad: 0, longitudeRad }, 0)).toBeCloseTo(
          Math.abs(longitudeRad),
          12,
        );
      }),
    );
  });

  it('is the same east and west, and always within [0, π]', () => {
    fc.assert(
      fc.property(direction, latitude, (axis, earthLatitudeRad) => {
        const mirrored: HeliographicDirection = { ...axis, longitudeRad: -axis.longitudeRad };
        const angle = angleFromEarthRad(axis, earthLatitudeRad);
        expect(angleFromEarthRad(mirrored, earthLatitudeRad)).toBeCloseTo(angle, 12);
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThanOrEqual(Math.PI);
      }),
    );
  });
});

describe('isEarthInsideCone', () => {
  const W30 = { latitudeRad: 0, longitudeRad: 30 * RAD_PER_DEG };

  it('puts Earth outside a 25° cone aimed at W30 and inside a 35° one', () => {
    expect(isEarthInsideCone({ axis: W30, halfAngleRad: 25 * RAD_PER_DEG }, 0)).toBe(false);
    expect(isEarthInsideCone({ axis: W30, halfAngleRad: 35 * RAD_PER_DEG }, 0)).toBe(true);
  });

  it('counts the cone edge as inside', () => {
    const halfAngleRad = angleFromEarthRad(W30, 0);
    expect(isEarthInsideCone({ axis: W30, halfAngleRad }, 0)).toBe(true);
  });
});
