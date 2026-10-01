import { z } from 'zod';
import type { ApproachOrbit, LookedUpOrbit } from '../approachOrbits';
import { NEO_ORBIT_CLASSES, type NeoOrbitClass } from '../neoCatalog';
import { type Cell, readFiniteOrNull } from './cells';
import { type RawElements, toElements } from './sbdb';

/** SBDB sends element values and the epoch as strings; numbers are accepted too, as for the columnar APIs. */
const cellSchema = z.union([z.string(), z.number()]).nullable();

const sbdbObjectFoundSchema = z.object({
  object: z.object({ orbit_class: z.object({ code: z.string() }) }),
  orbit: z.object({
    epoch: cellSchema,
    elements: z.array(z.object({ name: z.string(), value: cellSchema })),
  }),
});

/** SBDB answers an unknown designation with HTTP 200 and this message, not an error status. */
const sbdbObjectNotFoundSchema = z.object({
  message: z.literal('specified object was not found'),
});

/**
 * One `sbdb.api` answer (extra fields allowed). A body that is neither an orbit nor "not found" fails here, so
 * a format change is never mistaken for an unknown object. https://ssd-api.jpl.nasa.gov/doc/sbdb.html
 */
export const sbdbObjectResponseSchema = z.union([sbdbObjectFoundSchema, sbdbObjectNotFoundSchema]);
export type SbdbObjectResponse = z.infer<typeof sbdbObjectResponseSchema>;
type SbdbObjectFound = z.infer<typeof sbdbObjectFoundSchema>;

const ELEMENT_NAMES = ['e', 'a', 'i', 'om', 'w', 'ma'] as const;

/** Rounded and checked exactly like a catalog row; null when not found, incomplete or unbound (e ≥ 1). */
export function toApproachOrbit(response: SbdbObjectResponse): ApproachOrbit | null {
  if (!('orbit' in response)) return null;
  return toElements(readRawElements(response.orbit));
}

export function toLookedUpOrbit(response: SbdbObjectResponse): LookedUpOrbit | null {
  const orbit = toApproachOrbit(response);
  if (orbit === null || !('object' in response)) return null;
  return { orbit, orbitClass: neoOrbitClass(response.object.orbit_class.code) };
}

function readRawElements(orbit: SbdbObjectFound['orbit']): RawElements | null {
  const valueOf = (name: string): Cell =>
    orbit.elements.find((e) => e.name === name)?.value ?? null;
  const [e, a, i, om, w, ma] = ELEMENT_NAMES.map((name) => readFiniteOrNull(valueOf(name)));
  const epoch = readFiniteOrNull(orbit.epoch);
  const raw = { epoch, e, a, i, om, w, ma };
  // Checked at runtime just above, so the narrowing cast is sound (as in sbdb.ts).
  return Object.values(raw).every((value) => value != null) ? (raw as RawElements) : null;
}

function neoOrbitClass(code: string): NeoOrbitClass | null {
  return NEO_ORBIT_CLASSES.find((neoClass) => neoClass === code) ?? null;
}
