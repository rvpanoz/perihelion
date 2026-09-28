import { z } from 'zod';

/**
 * One CAD row. These values are shown to the user as facts (CLAUDE.md), so they are kept exactly as
 * CAD printed them: never rounded, never recomputed by our engine. https://ssd-api.jpl.nasa.gov/doc/cad.html
 */
export const closeApproachSchema = z.object({
  designation: z.string(),
  fullName: z.string(),
  orbitId: z.string(),
  approachJdTdb: z.number(),
  /** CAD's own calendar string, TDB, e.g. "2026-Sep-28 12:00". */
  approachCalendarTdb: z.string(),
  distanceAu: z.number().nonnegative(),
  distanceMinAu: z.number().nonnegative(),
  distanceMaxAu: z.number().nonnegative(),
  relativeVelocityKmPerS: z.number().nonnegative(),
  infinityVelocityKmPerS: z.number().nonnegative().nullable(),
  /** 3-sigma uncertainty in the approach time as CAD formats it, e.g. "< 00:01" or "2_03:15". */
  timeUncertainty: z.string().nullable(),
  absoluteMagnitude: z.number().nullable(),
});
export type CloseApproach = z.infer<typeof closeApproachSchema>;
