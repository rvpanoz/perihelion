import type { CadApproach, CatalogOrbit, CloseApproach, LookedUpOrbit } from '@perihelion/data';
import { UpstreamFormatError } from '@perihelion/data';
import type { DatasetLogger } from './types.js';

/**
 * A week of CAD rows is ~20–40 objects, nearly all in the catalog. This many misses means the catalog is badly
 * out of date or the join broke, so the refresh fails (and the cache or snapshot is served) before any lookup.
 */
export const MAX_ORBIT_LOOKUPS = 25;

export interface OrbitJoin {
  approaches: readonly CadApproach[];
  catalogOrbits: ReadonlyMap<string, CatalogOrbit>;
  lookUpOrbit: (designation: string) => Promise<LookedUpOrbit | null>;
  logger: DatasetLogger;
}

/** Every row gets an orbit so every listed approach is playable; a row with none is dropped, never guessed. */
export async function attachOrbits(join: OrbitJoin): Promise<CloseApproach[]> {
  const misses = [...new Set(join.approaches.map((a) => a.designation))].filter(
    (designation) => !join.catalogOrbits.has(designation),
  );
  assertFewMisses(misses.length);
  const lookedUp = await lookUpSequentially(misses, join.lookUpOrbit);
  return join.approaches.flatMap((approach) => {
    const found =
      join.catalogOrbits.get(approach.designation) ?? lookedUp.get(approach.designation);
    if (found) return [{ ...approach, ...found }];
    join.logger.warn(
      { designation: approach.designation },
      'Close approach dropped: no usable orbit',
    );
    return [];
  });
}

function assertFewMisses(count: number): void {
  if (count > MAX_ORBIT_LOOKUPS) {
    throw new UpstreamFormatError(
      `${count} close approaches need an orbit lookup (max ${MAX_ORBIT_LOOKUPS})`,
    );
  }
}

/** One at a time: JPL asks API users not to send concurrent requests. */
async function lookUpSequentially(
  designations: readonly string[],
  lookUpOrbit: OrbitJoin['lookUpOrbit'],
): Promise<ReadonlyMap<string, LookedUpOrbit>> {
  const found = new Map<string, LookedUpOrbit>();
  for (const designation of designations) {
    const orbit = await lookUpOrbit(designation);
    if (orbit) found.set(designation, orbit);
  }
  return found;
}
