import { z } from 'zod';

/** SBDB orbit classes of near-Earth asteroids: Atira (IEO), Aten, Apollo, Amor. */
export const NEO_ORBIT_CLASSES = ['IEO', 'ATE', 'APO', 'AMO'] as const;
export type NeoOrbitClass = (typeof NEO_ORBIT_CLASSES)[number];

/** Most gzip may leave of /api/neos on the wire (PLAN.md Phase 2 exit criterion). Never loosen. */
export const NEO_PAYLOAD_BUDGET_BYTES = 2_000_000;

// Columnar, not one object per NEO: field names once instead of 40k times, and arrays map straight
// onto the swarm's instanced GPU attributes in Phase 4.
const NEO_COLUMNS = {
  designation: z.array(z.string()),
  name: z.array(z.string().nullable()),
  epochJdTdb: z.array(z.number()),
  eccentricity: z.array(z.number().min(0).lt(1)),
  semiMajorAxisAu: z.array(z.number().positive()),
  inclinationDeg: z.array(z.number()),
  longitudeOfAscendingNodeDeg: z.array(z.number()),
  argumentOfPerihelionDeg: z.array(z.number()),
  meanAnomalyDeg: z.array(z.number()),
  absoluteMagnitude: z.array(z.number().nullable()),
  orbitClass: z.array(z.enum(NEO_ORBIT_CLASSES)),
};
const NEO_COLUMN_NAMES = Object.keys(NEO_COLUMNS) as (keyof typeof NEO_COLUMNS)[];

export const neoCatalogSchema = z
  .object({ count: z.number().int().nonnegative(), ...NEO_COLUMNS })
  .refine((catalog) => NEO_COLUMN_NAMES.every((name) => catalog[name].length === catalog.count), {
    message: 'Every column must have `count` entries',
  });
export type NeoCatalog = z.infer<typeof neoCatalogSchema>;
