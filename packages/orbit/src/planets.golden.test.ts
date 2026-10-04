import { PLANET_SAMPLE_JD_TDB, loadPlanetFixtures } from '@perihelion/fixtures/golden';
import { describe, expect, it } from 'vitest';
import { KM_PER_AU } from './index';
import { type Planet, PLANETS, STANDISH_TABLE_1_VALID_JD_TDB, planetStateAt } from './planets';
import { type Vector3, norm } from './vector3';

const ARCSEC_PER_RAD = (180 * 3600) / Math.PI;
const KM_PER_THOUSAND_KM = 1000;

/** The units of Standish's accuracy table (https://ssd.jpl.nasa.gov/planets/approx_pos.html). */
interface HeliocentricError {
  longitudeArcsec: number;
  latitudeArcsec: number;
  distanceThousandKm: number;
}

interface EclipticSpherical {
  longitudeRad: number;
  latitudeRad: number;
  distanceAu: number;
}

interface FixtureSample {
  jdTdb: number;
  positionAu: Readonly<Vector3>;
}

/**
 * Worst error over the 27 fixture dates against Horizons (DE441, Sun-centred), measured on
 * 2026-09-28. Every planet exceeds Standish's nominal 1800–2050 errors somewhere, by 1.1–2.3×
 * (Neptune ~6×), with no engine bug found: see docs/accuracy.md.
 */
const MEASURED_MAX_ERROR: Readonly<Record<Planet, HeliocentricError>> = {
  mercury: { longitudeArcsec: 25.1, latitudeArcsec: 2.33, distanceThousandKm: 1.8 },
  venus: { longitudeArcsec: 25.2, latitudeArcsec: 1.5, distanceThousandKm: 5.6 },
  earthMoonBarycenter: { longitudeArcsec: 19.7, latitudeArcsec: 1.62, distanceThousandKm: 7.1 },
  mars: { longitudeArcsec: 58.8, latitudeArcsec: 1.37, distanceThousandKm: 24.1 },
  jupiter: { longitudeArcsec: 454.6, latitudeArcsec: 7.1, distanceThousandKm: 568.9 },
  saturn: { longitudeArcsec: 712.7, latitudeArcsec: 22.95, distanceThousandKm: 2801.9 },
  uranus: { longitudeArcsec: 101.9, latitudeArcsec: 3.51, distanceThousandKm: 1341.5 },
  neptune: { longitudeArcsec: 59.1, latitudeArcsec: 1.67, distanceThousandKm: 1257.1 },
};

/** Room for harmless numeric changes (solver iterations, operation order); real bugs move far more. */
const TOLERANCE_MARGIN = 1.25;

const NO_ERROR: HeliocentricError = {
  longitudeArcsec: 0,
  latitudeArcsec: 0,
  distanceThousandKm: 0,
};

function toEclipticSpherical(positionAu: Readonly<Vector3>): EclipticSpherical {
  const distanceAu = norm(positionAu);
  return {
    longitudeRad: Math.atan2(positionAu[1], positionAu[0]),
    latitudeRad: Math.asin(positionAu[2] / distanceAu),
    distanceAu,
  };
}

/** Wrapped to (−π, π] so a difference across the 0/2π seam is not read as a full turn. */
function angleDifferenceRad(firstRad: number, secondRad: number): number {
  const differenceRad = firstRad - secondRad;
  return Math.atan2(Math.sin(differenceRad), Math.cos(differenceRad));
}

function heliocentricError(
  enginePositionAu: Readonly<Vector3>,
  horizonsPositionAu: Readonly<Vector3>,
): HeliocentricError {
  const engine = toEclipticSpherical(enginePositionAu);
  const horizons = toEclipticSpherical(horizonsPositionAu);
  const longitudeRad = angleDifferenceRad(engine.longitudeRad, horizons.longitudeRad);
  return {
    longitudeArcsec: Math.abs(longitudeRad) * ARCSEC_PER_RAD,
    latitudeArcsec: Math.abs(engine.latitudeRad - horizons.latitudeRad) * ARCSEC_PER_RAD,
    distanceThousandKm:
      (Math.abs(engine.distanceAu - horizons.distanceAu) * KM_PER_AU) / KM_PER_THOUSAND_KM,
  };
}

function largerOfEach(first: HeliocentricError, second: HeliocentricError): HeliocentricError {
  return {
    longitudeArcsec: Math.max(first.longitudeArcsec, second.longitudeArcsec),
    latitudeArcsec: Math.max(first.latitudeArcsec, second.latitudeArcsec),
    distanceThousandKm: Math.max(first.distanceThousandKm, second.distanceThousandKm),
  };
}

function worstError(planet: Planet, samples: readonly FixtureSample[]): HeliocentricError {
  return samples
    .map(({ jdTdb, positionAu }) =>
      heliocentricError(planetStateAt(planet, jdTdb).positionAu, positionAu),
    )
    .reduce(largerOfEach, NO_ERROR);
}

function toleranceFor(planet: Planet): HeliocentricError {
  const measured = MEASURED_MAX_ERROR[planet];
  return {
    longitudeArcsec: measured.longitudeArcsec * TOLERANCE_MARGIN,
    latitudeArcsec: measured.latitudeArcsec * TOLERANCE_MARGIN,
    distanceThousandKm: measured.distanceThousandKm * TOLERANCE_MARGIN,
  };
}

const fixtures = loadPlanetFixtures();

describe('planetStateAt against Horizons', () => {
  it('has a fixture state for every sample date, all inside Standish Table 1 range', () => {
    const { startJdTdb, endJdTdb } = STANDISH_TABLE_1_VALID_JD_TDB;
    for (const planet of PLANETS) {
      expect(fixtures.planets[planet].states.map(({ jdTdb }) => jdTdb)).toEqual(
        PLANET_SAMPLE_JD_TDB,
      );
    }
    expect(Math.min(...PLANET_SAMPLE_JD_TDB)).toBeGreaterThanOrEqual(startJdTdb);
    expect(Math.max(...PLANET_SAMPLE_JD_TDB)).toBeLessThanOrEqual(endJdTdb);
  });

  it.each(PLANETS)('keeps %s within its calibrated tolerance', (planet) => {
    const worst = worstError(planet, fixtures.planets[planet].states);
    const tolerance = toleranceFor(planet);
    expect(worst.longitudeArcsec).toBeLessThanOrEqual(tolerance.longitudeArcsec);
    expect(worst.latitudeArcsec).toBeLessThanOrEqual(tolerance.latitudeArcsec);
    expect(worst.distanceThousandKm).toBeLessThanOrEqual(tolerance.distanceThousandKm);
  });
});
