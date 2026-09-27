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
  settings: z.record(z.string(), z.string()),
});

export const planetFixturesSchema = z.object({
  source: sourceSchema,
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
      elements: elementsRecordSchema,
      states: z.array(stateRecordSchema),
    }),
  ),
});

export type PlanetFixtures = z.infer<typeof planetFixturesSchema>;
export type AsteroidFixtures = z.infer<typeof asteroidFixturesSchema>;
export type PlanetFixture = PlanetFixtures['planets'][PlanetName];
export type AsteroidFixture = AsteroidFixtures['asteroids'][AsteroidName];
