import { z } from 'zod';

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const stateRecordSchema = z.object({
  jdTdb: z.number(),
  positionAu: vector3Schema,
  velocityAuPerDay: vector3Schema,
});

/** Horizons osculating elements, degrees as published (converted to radians by the tests). */
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
