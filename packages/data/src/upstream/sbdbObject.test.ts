import {
  RECORDED_SBDB_OBJECT_LOOKUPS,
  SBDB_NOT_FOUND_DESIGNATION,
} from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { ZodError, z } from 'zod';
import { roundTo } from './sbdb';
import { sbdbObjectResponseSchema, toApproachOrbit, toLookedUpOrbit } from './sbdbObject';

const LOOKUPS = z.record(z.string(), z.unknown()).parse(RECORDED_SBDB_OBJECT_LOOKUPS);
const FOUND_DESIGNATION = Object.keys(LOOKUPS).find((d) => d !== SBDB_NOT_FOUND_DESIGNATION) ?? '';

const recordedShape = z.object({
  object: z.object({ orbit_class: z.object({ code: z.string() }) }),
  orbit: z.object({
    epoch: z.string(),
    elements: z.array(z.object({ name: z.string(), value: z.string().nullable() })),
  }),
});
type RecordedLookup = z.infer<typeof recordedShape>;

/** A deep copy, so a test can alter the recording without touching the fixture. */
function recordedFound(): RecordedLookup {
  return recordedShape.parse(JSON.parse(JSON.stringify(LOOKUPS[FOUND_DESIGNATION])));
}

function element(body: RecordedLookup, name: string): number {
  return Number(body.orbit.elements.find((e) => e.name === name)?.value);
}

function withElement(name: string, value: string | undefined): RecordedLookup {
  const body = recordedFound();
  const elements = body.orbit.elements.filter((e) => e.name !== name);
  if (value !== undefined) elements.push({ name, value });
  return { ...body, orbit: { ...body.orbit, elements } };
}

const parse = (body: unknown) => sbdbObjectResponseSchema.parse(body);

describe('toApproachOrbit', () => {
  it('rounds the recorded elements like the catalog and keeps the epoch', () => {
    const body = recordedFound();
    expect(toApproachOrbit(parse(body))).toEqual({
      epochJdTdb: Number(body.orbit.epoch),
      eccentricity: roundTo(element(body, 'e'), 8),
      semiMajorAxisAu: roundTo(element(body, 'a'), 8),
      inclinationDeg: roundTo(element(body, 'i'), 6),
      longitudeOfAscendingNodeDeg: roundTo(element(body, 'om'), 6),
      argumentOfPerihelionDeg: roundTo(element(body, 'w'), 6),
      meanAnomalyDeg: roundTo(element(body, 'ma'), 6),
    });
  });

  it('has no orbit for an unbound eccentricity or a missing element', () => {
    expect(toApproachOrbit(parse(withElement('e', '1.2')))).toBeNull();
    expect(toApproachOrbit(parse(withElement('ma', undefined)))).toBeNull();
  });

  it('has no orbit for the recorded "not found" answer', () => {
    expect(toApproachOrbit(parse(LOOKUPS[SBDB_NOT_FOUND_DESIGNATION]))).toBeNull();
  });

  it('rejects any other body without an orbit', () => {
    expect(() => parse({ object: { des: FOUND_DESIGNATION } })).toThrow(ZodError);
  });
});

describe('toLookedUpOrbit', () => {
  it('carries the recorded orbit class', () => {
    const body = recordedFound();
    expect(toLookedUpOrbit(parse(body))?.orbitClass).toBe(body.object.orbit_class.code);
  });

  it('has no class for a code outside the NEO classes, but keeps the orbit', () => {
    const body = recordedFound();
    const mainBelt = { ...body, object: { ...body.object, orbit_class: { code: 'MBA' } } };
    expect(toLookedUpOrbit(parse(mainBelt))).toMatchObject({
      orbitClass: null,
      orbit: expect.any(Object),
    });
  });

  it('is null when SBDB does not know the object', () => {
    expect(toLookedUpOrbit(parse(LOOKUPS[SBDB_NOT_FOUND_DESIGNATION]))).toBeNull();
  });
});
