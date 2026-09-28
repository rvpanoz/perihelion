import { RECORDED_SBDB_NEO_SAMPLE } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { NEO_ORBIT_CLASSES, neoCatalogSchema } from '../neoCatalog';
import { jplColumnarResponseSchema } from './cells';
import { type SbdbNeoField, SBDB_NEO_FIELDS } from './queries';
import { roundTo, toNeoCatalog } from './sbdb';
import { UpstreamFormatError } from './upstreamFormatError';

type SbdbRow = Record<SbdbNeoField, string | null>;

// Horizons' osculating elements for 433 Eros at JD 2461000.5 (packages/fixtures), as SBDB would send them.
const EROS: SbdbRow = {
  pdes: '433',
  name: 'Eros',
  epoch: '2461000.5',
  e: '0.2228359405976197',
  a: '1.458120998504457',
  i: '10.82846651482517',
  om: '304.270102574398',
  w: '178.9297536745088',
  ma: '310.5543275803852',
  H: '10.38',
  class: 'AMO',
};

// Reversed on purpose: rows are keyed by field name, not position.
const FIELDS = [...SBDB_NEO_FIELDS].reverse();

function sbdbResponse(rows: readonly SbdbRow[]) {
  const data = rows.map((row) => FIELDS.map((field) => row[field]));
  return jplColumnarResponseSchema.parse({
    signature: { version: '1.0' },
    count: rows.length,
    fields: FIELDS,
    data,
  });
}

const copies = (row: SbdbRow, count: number) => Array.from({ length: count }, () => row);

describe('toNeoCatalog', () => {
  it('normalizes every row of the recorded SBDB sample into a valid columnar catalog', () => {
    const response = jplColumnarResponseSchema.parse(RECORDED_SBDB_NEO_SAMPLE);
    const catalog = neoCatalogSchema.parse(toNeoCatalog(response));
    expect(catalog.count).toBe(response.data.length);
    expect(catalog.orbitClass.every((orbitClass) => NEO_ORBIT_CLASSES.includes(orbitClass))).toBe(
      true,
    );
  });

  it('rounds elements to about a kilometre and keeps the epoch exact', () => {
    const catalog = toNeoCatalog(sbdbResponse([EROS]));
    expect(catalog).toEqual({
      count: 1,
      designation: ['433'],
      name: ['Eros'],
      epochJdTdb: [2461000.5],
      eccentricity: [0.22283594],
      semiMajorAxisAu: [1.458121],
      inclinationDeg: [10.828467],
      longitudeOfAscendingNodeDeg: [304.270103],
      argumentOfPerihelionDeg: [178.929754],
      meanAnomalyDeg: [310.554328],
      absoluteMagnitude: [10.38],
      orbitClass: ['AMO'],
    });
  });

  it('keeps unnamed objects and unknown magnitudes as null', () => {
    const catalog = toNeoCatalog(sbdbResponse([{ ...EROS, name: null, H: null }]));
    expect(catalog.name).toEqual([null]);
    expect(catalog.absoluteMagnitude).toEqual([null]);
  });

  it('skips a rare unusable row: unbound orbit, unknown class or missing element', () => {
    const bad = [
      { ...EROS, e: '1.2' },
      { ...EROS, class: 'MBA' },
      { ...EROS, ma: null },
    ];
    for (const row of bad) {
      expect(toNeoCatalog(sbdbResponse([...copies(EROS, 200), row])).count).toBe(200);
    }
  });

  it('skips a row whose eccentricity only reaches 1 after rounding', () => {
    // 0.999999996 rounds to 1 at 8 decimals, which neoCatalogSchema rejects (e < 1).
    const nearlyUnbound = { ...EROS, e: '0.999999996' };
    expect(toNeoCatalog(sbdbResponse([...copies(EROS, 200), nearlyUnbound])).count).toBe(200);
  });

  it('tolerates exactly 1% unusable rows: the limit is "more than 1%"', () => {
    const rows = [...copies(EROS, 99), { ...EROS, a: null }];
    expect(toNeoCatalog(sbdbResponse(rows)).count).toBe(99);
  });

  it('fails loudly when more than 1% of rows are unusable, which means the format changed', () => {
    const rows = [...copies(EROS, 98), { ...EROS, a: null }, { ...EROS, a: null }];
    expect(() => toNeoCatalog(sbdbResponse(rows))).toThrow(UpstreamFormatError);
  });

  it('fails loudly on an empty answer: a catalog of zero NEOs is never legitimate', () => {
    expect(() => toNeoCatalog(sbdbResponse([]))).toThrow(UpstreamFormatError);
  });

  it('fails loudly when SBDB reports matches but the fields and data keys are gone', () => {
    const drifted = jplColumnarResponseSchema.parse({
      signature: { version: '1.0' },
      count: 42534,
    });
    expect(() => toNeoCatalog(drifted)).toThrow(UpstreamFormatError);
  });
});

describe('roundTo', () => {
  it('lands on the short decimal despite float noise', () => {
    expect(roundTo(1.458120998504457, 8)).toBe(1.458121);
    expect(String(roundTo(0.1 + 0.2, 8))).toBe('0.3');
  });
});

describe('neoCatalogSchema', () => {
  it('rejects columns whose length differs from count', () => {
    const catalog = { ...toNeoCatalog(sbdbResponse([EROS])), designation: [] };
    expect(neoCatalogSchema.safeParse(catalog).success).toBe(false);
  });
});
