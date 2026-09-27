import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeAngleRad } from './angles';
import { createStateVector } from './elements';
import { PLANETS, STANDISH_TABLE_1_VALID_JD_TDB, planetElementsAt, planetStateAt } from './planets';
import { julianDateFromCalendar } from './time';
import { norm } from './vector3';

const RAD_PER_DEG = Math.PI / 180;
const J2000_JD_TDB = 2_451_545;
const ANOMALISTIC_YEAR_DAYS = 365.259636;
const { startJdTdb, endJdTdb } = STANDISH_TABLE_1_VALID_JD_TDB;
const validJdTdb = fc.double({ min: startJdTdb, max: endJdTdb, noNaN: true });
const planet = fc.constantFrom(...PLANETS);

function jdOfNewYear(year: number): number {
  return julianDateFromCalendar({ year, month: 1, day: 1, hour: 0, minute: 0, second: 0 });
}

describe('PLANETS', () => {
  it('lists the eight planets outward from the Sun, Earth as the Earth–Moon barycentre', () => {
    expect(PLANETS).toEqual([
      'mercury',
      'venus',
      'earthMoonBarycenter',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ]);
  });
});

describe('STANDISH_TABLE_1_VALID_JD_TDB', () => {
  it('spans 1800 to 2050', () => {
    expect(startJdTdb).toBe(jdOfNewYear(1800));
    expect(endJdTdb).toBe(jdOfNewYear(2050));
  });
});

describe('planetElementsAt', () => {
  // Hand-copied from Table 1, independently of the scripted transcription in planets.ts.
  it('reproduces Mercury’s Table 1 row at J2000', () => {
    const mercury = planetElementsAt('mercury', J2000_JD_TDB);
    expect(mercury.semiMajorAxisAu).toBe(0.38709927);
    expect(mercury.eccentricity).toBe(0.20563593);
    expect(mercury.inclinationRad / RAD_PER_DEG).toBeCloseTo(7.00497902, 10);
    expect(mercury.longitudeOfAscendingNodeRad / RAD_PER_DEG).toBeCloseTo(48.33076593, 9);
    expect(mercury.argumentOfPerihelionRad / RAD_PER_DEG).toBeCloseTo(77.45779628 - 48.33076593, 9);
    expect(mercury.meanAnomalyRad / RAD_PER_DEG).toBeCloseTo(252.2503235 - 77.45779628, 9);
    expect(mercury.epochJdTdb).toBe(J2000_JD_TDB);
  });

  it('advances Earth’s mean anomaly one turn per anomalistic year', () => {
    const start = planetElementsAt('earthMoonBarycenter', J2000_JD_TDB).meanAnomalyRad;
    const later = planetElementsAt('earthMoonBarycenter', J2000_JD_TDB + ANOMALISTIC_YEAR_DAYS);
    const driftRad = normalizeAngleRad(later.meanAnomalyRad - start + Math.PI) - Math.PI;
    expect(Math.abs(driftRad / RAD_PER_DEG)).toBeLessThan(0.01);
  });

  // Catches a rate transcribed into the wrong column: real drifts over 250 years are tiny.
  it('keeps every orbit’s size, shape and tilt nearly fixed across 1800–2050', () => {
    fc.assert(
      fc.property(planet, validJdTdb, (body, jdTdb) => {
        const atJ2000 = planetElementsAt(body, J2000_JD_TDB);
        const atDate = planetElementsAt(body, jdTdb);
        expect(Math.abs(atDate.semiMajorAxisAu / atJ2000.semiMajorAxisAu - 1)).toBeLessThan(1e-3);
        expect(Math.abs(atDate.eccentricity - atJ2000.eccentricity)).toBeLessThan(5e-3);
        const tiltChangeDeg = (atDate.inclinationRad - atJ2000.inclinationRad) / RAD_PER_DEG;
        expect(Math.abs(tiltChangeDeg)).toBeLessThan(0.05);
      }),
    );
  });
});

describe('planetStateAt', () => {
  // Meeus, Astronomical Algorithms (2nd ed.), ch. 25, at JD 2451545.0: the Sun's true longitude
  // is 280.382° and R = 0.98331 AU, so the Earth sits at heliocentric longitude 100.382°.
  it('puts the Earth where the Sun’s J2000.0 position implies', () => {
    const [x, y] = planetStateAt('earthMoonBarycenter', J2000_JD_TDB).positionAu;
    const longitudeDeg = normalizeAngleRad(Math.atan2(y, x)) / RAD_PER_DEG;
    expect(Math.abs(longitudeDeg - 100.382)).toBeLessThan(0.02);
    expect(Math.abs(Math.hypot(x, y) - 0.98331)).toBeLessThan(2e-4);
  });

  it('keeps the Earth on the ecliptic', () => {
    fc.assert(
      fc.property(validJdTdb, (jdTdb) => {
        const [, , z] = planetStateAt('earthMoonBarycenter', jdTdb).positionAu;
        expect(Math.abs(z)).toBeLessThan(5e-4);
      }),
    );
  });

  it('keeps each planet between its perihelion and aphelion', () => {
    fc.assert(
      fc.property(planet, validJdTdb, (body, jdTdb) => {
        const { semiMajorAxisAu: a, eccentricity: e } = planetElementsAt(body, jdTdb);
        const distanceAu = norm(planetStateAt(body, jdTdb).positionAu);
        expect(distanceAu).toBeGreaterThanOrEqual(a * (1 - e) * (1 - 1e-12));
        expect(distanceAu).toBeLessThanOrEqual(a * (1 + e) * (1 + 1e-12));
      }),
    );
  });

  it('writes into and returns the out argument', () => {
    const out = createStateVector();
    expect(planetStateAt('mars', J2000_JD_TDB, out)).toBe(out);
    expect(norm(out.positionAu)).toBeGreaterThan(1.3);
  });
});
