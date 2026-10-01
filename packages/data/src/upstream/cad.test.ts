import { RECORDED_CAD_EMPTY, RECORDED_CAD_WINDOW } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { cadApproachSchema } from '../closeApproach';
import { CAD_FIELDS, toCloseApproaches } from './cad';
import { jplColumnarResponseSchema } from './cells';
import { UpstreamFormatError } from './upstreamFormatError';

const ROW = [
  '2026 AB',
  '5',
  '2461312.5',
  '2026-Sep-28 12:00',
  '0.0123',
  '0.0122',
  '0.0124',
  '8.5',
  null,
  '< 00:01',
  null,
  '       (2026 AB)',
  null,
  null,
];

function cadResponse(rows: (string | null)[][]) {
  return jplColumnarResponseSchema.parse({
    signature: { version: '1.5' },
    count: String(rows.length),
    fields: CAD_FIELDS,
    data: rows,
  });
}

describe('toCloseApproaches', () => {
  it('keeps every recorded approach, with distances exactly as CAD printed them', () => {
    const response = jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW);
    const approaches = toCloseApproaches(response);
    const distIndex = response.fields.indexOf('dist');
    const ascending = (a: number, b: number) => a - b;
    expect(approaches).toHaveLength(response.data.length);
    expect(approaches.map((a) => a.distanceAu).toSorted(ascending)).toEqual(
      response.data.map((row) => Number(row[distIndex])).toSorted(ascending),
    );
    for (const approach of approaches) cadApproachSchema.parse(approach);
  });

  it('sorts approaches by time', () => {
    const approaches = toCloseApproaches(jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW));
    const times = approaches.map((a) => a.approachJdTdb);
    expect(times).toEqual(times.toSorted((a, b) => a - b));
  });

  it('returns no approaches for the recorded empty answer', () => {
    expect(toCloseApproaches(jplColumnarResponseSchema.parse(RECORDED_CAD_EMPTY))).toEqual([]);
  });

  it('maps one row field by field, trimming the padded full name', () => {
    expect(toCloseApproaches(cadResponse([ROW]))).toEqual([
      {
        designation: '2026 AB',
        fullName: '(2026 AB)',
        orbitId: '5',
        approachJdTdb: 2461312.5,
        approachCalendarTdb: '2026-Sep-28 12:00',
        distanceAu: 0.0123,
        distanceMinAu: 0.0122,
        distanceMaxAu: 0.0124,
        relativeVelocityKmPerS: 8.5,
        infinityVelocityKmPerS: null,
        timeUncertainty: '< 00:01',
        absoluteMagnitude: null,
        diameterKm: null,
        diameterSigmaKm: null,
      },
    ]);
  });

  it("reads JPL's diameter and its sigma when CAD has them", () => {
    const withDiameter = ROW.map((cell, index) => {
      if (index === CAD_FIELDS.indexOf('diameter')) return '0.32';
      return index === CAD_FIELDS.indexOf('diameter_sigma') ? '0.05' : cell;
    });
    expect(toCloseApproaches(cadResponse([withDiameter]))[0]).toMatchObject({
      diameterKm: 0.32,
      diameterSigmaKm: 0.05,
    });
  });

  it('reads the recorded diameters as CAD printed them, null where CAD has none', () => {
    const response = jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW);
    const column = response.fields.indexOf('diameter');
    const printed = response.data
      .map((row) => row[column] ?? null)
      .map((cell) => cell && Number(cell));
    const read = toCloseApproaches(response).map((approach) => approach.diameterKm);
    expect(read.toSorted()).toEqual(printed.toSorted());
  });

  it('rejects a row whose distance is not a number rather than guessing', () => {
    const bad = ROW.map((cell, index) => (index === CAD_FIELDS.indexOf('dist') ? 'n/a' : cell));
    expect(() => toCloseApproaches(cadResponse([bad]))).toThrow(UpstreamFormatError);
  });
});
