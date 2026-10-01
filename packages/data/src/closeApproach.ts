import { z } from 'zod';
import { approachOrbitSchema } from './approachOrbits';
import { NEO_ORBIT_CLASSES } from './neoCatalog';

/**
 * One CAD row. These values are shown to the user as facts (CLAUDE.md), so they are kept exactly as
 * CAD printed them: never rounded, never recomputed by our engine. https://ssd-api.jpl.nasa.gov/doc/cad.html
 */
export const cadApproachSchema = z.object({
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
  /** JPL's diameter and its 1-sigma, in km, when CAD has one (`diameter=true`); null otherwise. */
  diameterKm: z.number().positive().nullable(),
  diameterSigmaKm: z.number().nonnegative().nullable(),
});
/** A row as CAD gives it, before the server attaches the asteroid's orbit. */
export type CadApproach = z.infer<typeof cadApproachSchema>;

/**
 * A CAD row with the orbit that makes it playable: from the NEO catalog, or an SBDB lookup for objects the
 * catalog lacks. The orbit is for drawing the pass; the displayed facts above stay CAD's.
 */
export const closeApproachSchema = cadApproachSchema.extend({
  orbit: approachOrbitSchema,
  /** SBDB's class; null when a looked-up object's class is not one of the four NEO classes. */
  orbitClass: z.enum(NEO_ORBIT_CLASSES).nullable(),
});
export type CloseApproach = z.infer<typeof closeApproachSchema>;
