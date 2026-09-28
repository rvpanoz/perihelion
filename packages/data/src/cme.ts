import { z } from 'zod';

/**
 * DONKI's CME analysis, measured when the front reaches 21.5 solar radii. Latitude and longitude are
 * Stonyhurst heliographic (HEEQ) degrees of the cone axis; the half-angle is the cone's angular half-width.
 * https://ccmc.gsfc.nasa.gov/tools/DONKI/
 */
export const cmeAnalysisSchema = z.object({
  time21_5: z.iso.datetime(),
  latitudeDeg: z.number(),
  longitudeDeg: z.number(),
  halfAngleDeg: z.number().positive(),
  speedKmPerS: z.number().positive(),
  type: z.string().nullable(),
});
export type CmeAnalysis = z.infer<typeof cmeAnalysisSchema>;

export const cmeSchema = z.object({
  activityId: z.string(),
  startTime: z.iso.datetime(),
  sourceLocation: z.string().nullable(),
  note: z.string().nullable(),
  link: z.string().nullable(),
  analysis: cmeAnalysisSchema,
});
export type Cme = z.infer<typeof cmeSchema>;
