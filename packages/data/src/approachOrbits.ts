import { z } from 'zod';
import type { NeoCatalog, NeoOrbitClass } from './neoCatalog';

/**
 * Osculating elements for one asteroid, with the NEO catalog's names, units and rounding, so a catalog row maps
 * across 1:1. Heliocentric ecliptic J2000; epoch as JD TDB; angles in degrees (converted at the engine boundary).
 */
export const approachOrbitSchema = z.object({
  epochJdTdb: z.number(),
  eccentricity: z.number().min(0).lt(1),
  semiMajorAxisAu: z.number().positive(),
  inclinationDeg: z.number(),
  longitudeOfAscendingNodeDeg: z.number(),
  argumentOfPerihelionDeg: z.number(),
  meanAnomalyDeg: z.number(),
});
export type ApproachOrbit = z.infer<typeof approachOrbitSchema>;

export interface CatalogOrbit {
  orbit: ApproachOrbit;
  orbitClass: NeoOrbitClass;
}

/** From an SBDB lookup, whose class may fall outside the four NEO classes. */
export interface LookedUpOrbit {
  orbit: ApproachOrbit;
  orbitClass: NeoOrbitClass | null;
}

/** Built once per refresh: CAD rows join the catalog by designation (CAD `des` = SBDB `pdes`). */
export function indexCatalogOrbits(catalog: NeoCatalog): ReadonlyMap<string, CatalogOrbit> {
  return new Map(
    catalog.designation.map((designation, row) => [designation, catalogOrbitAt(catalog, row)]),
  );
}

function catalogOrbitAt(catalog: NeoCatalog, row: number): CatalogOrbit {
  const at = <T>(column: readonly T[]): T => cellAt(column, row);
  return {
    orbit: {
      epochJdTdb: at(catalog.epochJdTdb),
      eccentricity: at(catalog.eccentricity),
      semiMajorAxisAu: at(catalog.semiMajorAxisAu),
      inclinationDeg: at(catalog.inclinationDeg),
      longitudeOfAscendingNodeDeg: at(catalog.longitudeOfAscendingNodeDeg),
      argumentOfPerihelionDeg: at(catalog.argumentOfPerihelionDeg),
      meanAnomalyDeg: at(catalog.meanAnomalyDeg),
    },
    orbitClass: at(catalog.orbitClass),
  };
}

/** neoCatalogSchema guarantees every column has `count` entries, so a gap means an unvalidated catalog. */
function cellAt<T>(column: readonly T[], row: number): T {
  const cell = column[row];
  if (cell === undefined) throw new RangeError(`NEO catalog column has no row ${row}`);
  return cell;
}
