import { z } from 'zod';

/**
 * DONKI's CME analysis, measured when the front reaches 21.5 solar radii. Latitude and longitude are
 * Stonyhurst heliographic (HEEQ) degrees of the cone axis; the half-angle is the cone's angular half-width.
 * https://ccmc.gsfc.nasa.gov/tools/DONKI/
 */
/**
 * ENLIL's predicted Earth arrival for an analysis, as DONKI reports it: a model forecast, shown as DONKI's
 * prediction, never as an observed arrival.
 */
export const cmeEarthArrivalSchema = z.object({
  predictedTime: z.iso.datetime(),
  isGlancingBlow: z.boolean(),
  isMinorImpact: z.boolean(),
});
export type CmeEarthArrival = z.infer<typeof cmeEarthArrivalSchema>;

/** The UI renders CME links, so only web links get through (never `javascript:` or relative paths). */
export const cmeLinkSchema = z.url({ protocol: /^https?$/ });

export const cmeAnalysisSchema = z.object({
  time21_5: z.iso.datetime(),
  latitudeDeg: z.number(),
  longitudeDeg: z.number(),
  halfAngleDeg: z.number().positive(),
  speedKmPerS: z.number().positive(),
  type: z.string().nullable(),
  earthArrival: cmeEarthArrivalSchema.nullable(),
  /**
   * ENLIL runs on this analysis, for any target. With no Earth arrival, 0 means ENLIL never ran and more means it
   * ran and predicted none, which the UI says differently (Task 3 decision 3).
   */
  enlilRunCount: z.number().int().nonnegative(),
});
export type CmeAnalysis = z.infer<typeof cmeAnalysisSchema>;

export const cmeSchema = z.object({
  activityId: z.string(),
  startTime: z.iso.datetime(),
  sourceLocation: z.string().nullable(),
  note: z.string().nullable(),
  link: cmeLinkSchema.nullable(),
  analysis: cmeAnalysisSchema,
});
export type Cme = z.infer<typeof cmeSchema>;
