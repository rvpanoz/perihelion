import { z } from 'zod';
import { ASTEROID_NAMES, PLANET_NAMES, type AsteroidName, type PlanetName } from './fixtureSpec';

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const stateRecordSchema = z.object({
  jdTdb: z.number(),
  positionAu: vector3Schema,
  velocityAuPerDay: vector3Schema,
});

/** Horizons osculating elements, degrees as published (converted to radians downstream). */
export const elementsRecordSchema = z.object({
  epochJdTdb: z.number(),
  eccentricity: z.number(),
  perihelionDistanceAu: z.number(),
  inclinationDeg: z.number(),
  longitudeOfAscendingNodeDeg: z.number(),
  argumentOfPerihelionDeg: z.number(),
  timeOfPerihelionJdTdb: z.number(),
  meanMotionDegPerDay: z.number(),
  meanAnomalyDeg: z.number(),
  trueAnomalyDeg: z.number(),
  semiMajorAxisAu: z.number(),
});

export type StateRecord = z.infer<typeof stateRecordSchema>;
export type ElementsRecord = z.infer<typeof elementsRecordSchema>;

const sourceSchema = z.object({
  api: z.string(),
  apiVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  settings: z.record(z.string(), z.string()),
});

/**
 * What an asteroid's ground truth was computed from, so a newer solution cannot slip in unseen.
 * Kept per body: Horizons serves Bennu from OSIRIS-REx tracking on DE424, with no perturber set.
 */
const asteroidProvenanceSchema = z.object({
  orbitSolution: z.string().min(1),
  ephemeris: z.string().min(1),
  perturbers: z.string().min(1).nullable(),
  keplerianGmAu3PerDay2: z.number().positive(),
});

export const planetFixturesSchema = z.object({
  source: sourceSchema,
  /** Shared by every planet: Standish Table 1 is checked against a single ephemeris. */
  ephemeris: z.string().min(1),
  planets: z.record(
    z.enum(PLANET_NAMES),
    z.object({ horizonsId: z.string(), states: z.array(stateRecordSchema) }),
  ),
});

export const asteroidFixturesSchema = z.object({
  source: sourceSchema,
  epochJdTdb: z.number(),
  asteroids: z.record(
    z.enum(ASTEROID_NAMES),
    z.object({
      horizonsCommand: z.string(),
      provenance: asteroidProvenanceSchema,
      elements: elementsRecordSchema,
      states: z.array(stateRecordSchema),
    }),
  ),
});

/** Earth's position (Horizons body 399) and heliographic latitude B0 at one date. */
const sunSampleSchema = z.object({
  jdTdb: z.number(),
  earthPositionAu: vector3Schema,
  earthHeliographicLatitudeDeg: z.number(),
});

export const sunOrientationFixturesSchema = z.object({
  source: sourceSchema,
  /** The observer table's own settings; `source.settings` are the vector table's. */
  observerSettings: z.record(z.string(), z.string()),
  ephemeris: z.string().min(1),
  samples: z.array(sunSampleSchema),
});

export type FixtureSource = z.infer<typeof sourceSchema>;
export type AsteroidProvenance = z.infer<typeof asteroidProvenanceSchema>;
export type PlanetFixtures = z.infer<typeof planetFixturesSchema>;
export type AsteroidFixtures = z.infer<typeof asteroidFixturesSchema>;
export type SunOrientationFixtures = z.infer<typeof sunOrientationFixturesSchema>;
export type SunSample = z.infer<typeof sunSampleSchema>;
export type PlanetFixture = PlanetFixtures['planets'][PlanetName];
export type AsteroidFixture = AsteroidFixtures['asteroids'][AsteroidName];
