import { RECORDED_CAD_EMPTY, RECORDED_CAD_WINDOW } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { closeApproachSchema } from '../closeApproach';
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
    for (const approach of approaches) closeApproachSchema.parse(approach);
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
      },
    ]);
  });

  it('rejects a row whose distance is not a number rather than guessing', () => {
    const bad = ROW.map((cell, index) => (index === CAD_FIELDS.indexOf('dist') ? 'n/a' : cell));
    expect(() => toCloseApproaches(cadResponse([bad]))).toThrow(UpstreamFormatError);
  });
});
