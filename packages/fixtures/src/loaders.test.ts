import { describe, expect, it } from 'vitest';
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
  SUN_SAMPLE_JD_TDB,
} from './fixtureSpec';
import { asteroidFixturesSchema, planetFixturesSchema } from './fixtureSchema';
import { toStateRecord } from './horizonsRecords';
import { HORIZONS_FRAME_PARAMS } from './horizonsQuery';
import { parseHorizonsTable } from './horizonsTable';
import { loadAsteroidFixtures, loadPlanetFixtures, loadSunOrientationFixtures } from './loaders';

/** A fixture record with one field dropped, as a hand edit or an older generator would leave it. */
function withoutField(record: object, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([name]) => name !== field));
}

describe('committed Horizons fixtures', () => {
  it('have a state for every planet at every sample date', () => {
    const { planets } = loadPlanetFixtures();
    for (const name of PLANET_NAMES) {
      expect(planets[name].states.map((state) => state.jdTdb)).toEqual(PLANET_SAMPLE_JD_TDB);
    }
  });

  it('have elements at the epoch and states at every offset for every asteroid', () => {
    const { asteroids, epochJdTdb } = loadAsteroidFixtures();
    expect(epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
    for (const name of ASTEROID_NAMES) {
      expect(asteroids[name].elements.epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
      expect(asteroids[name].states.map((state) => state.jdTdb)).toEqual(ASTEROID_SAMPLE_JD_TDB);
    }
  });

  it('record the frame settings they were generated with', () => {
    expect(loadPlanetFixtures().source.settings).toEqual(HORIZONS_FRAME_PARAMS);
    expect(loadAsteroidFixtures().source.settings).toEqual(HORIZONS_FRAME_PARAMS);
  });

  it('agree with the independently recorded Earth–Moon barycentre response at J2000', () => {
    const recordedJ2000 = toStateRecord(parseHorizonsTable(vectorsResponse.result)[1] ?? {});
    const generated = loadPlanetFixtures().planets.earthMoonBarycenter.states;
    expect(generated.find((state) => state.jdTdb === 2451545)).toEqual(recordedJ2000);
  });

  it('record the ephemeris and the orbit solution each body came from', () => {
    expect(loadPlanetFixtures().ephemeris).toBe('DE441');
    const { asteroids } = loadAsteroidFixtures();
    // Horizons serves Bennu from OSIRIS-REx tracking rather than a JPL orbit fit.
    expect(asteroids.bennu.provenance).toMatchObject({
      orbitSolution: 'ORX_merged_DE424',
      perturbers: null,
    });
    for (const name of ASTEROID_NAMES.filter((asteroid) => asteroid !== 'bennu')) {
      expect(asteroids[name].provenance.orbitSolution).toMatch(/^JPL#\d+$/);
      expect(asteroids[name].provenance).toMatchObject({
        ephemeris: 'DE441',
        perturbers: 'SB441-N16',
      });
    }
  });

  it('are rejected when their provenance is missing', () => {
    const planets = loadPlanetFixtures();
    expect(planetFixturesSchema.safeParse(withoutField(planets, 'ephemeris')).success).toBe(false);
    const noApiVersion = { ...planets, source: withoutField(planets.source, 'apiVersion') };
    expect(planetFixturesSchema.safeParse(noApiVersion).success).toBe(false);
    const asteroids = loadAsteroidFixtures();
    const eros = withoutField(asteroids.asteroids.eros, 'provenance');
    const noProvenance = { ...asteroids, asteroids: { ...asteroids.asteroids, eros } };
    expect(asteroidFixturesSchema.safeParse(noProvenance).success).toBe(false);
  });
});

describe('committed Sun-orientation fixture', () => {
  // The solar equator is tilted 7.25° to the ecliptic (Carrington), so B0 can never exceed it.
  const SOLAR_EQUATOR_TILT_DEG = 7.25;

  it("has Earth's position and B0 at every sample date, within the solar equator's tilt", () => {
    const { samples } = loadSunOrientationFixtures();
    expect(samples.map((sample) => sample.jdTdb)).toEqual(SUN_SAMPLE_JD_TDB);
    for (const sample of samples) {
      expect(Math.abs(sample.earthHeliographicLatitudeDeg)).toBeLessThanOrEqual(
        SOLAR_EQUATOR_TILT_DEG,
      );
    }
  });
});
