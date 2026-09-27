import { describe, expect, it } from 'vitest';
import elementsResponse from './recorded/elements-eros.json' with { type: 'json' };
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { HorizonsError } from './horizonsResponse';
import { parseHorizonsTable } from './horizonsTable';

describe('parseHorizonsTable', () => {
  it('keys each vector row by the header Horizons prints above the table', () => {
    const rows = parseHorizonsTable(vectorsResponse.result);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ JDTDB: '2378496.500000000', X: '-2.249851741486615E-01' });
    expect(rows[1]).toMatchObject({ JDTDB: '2451545.000000000', X: '-1.771587841839055E-01' });
  });

  it('reads the osculating-element columns', () => {
    const [row] = parseHorizonsTable(elementsResponse.result);
    expect(Object.keys(row ?? {})).toEqual(
      expect.arrayContaining(['JDTDB', 'EC', 'QR', 'IN', 'OM', 'W', 'Tp', 'N', 'MA', 'TA', 'A']),
    );
  });

  it('rejects a result with no ephemeris table, quoting what Horizons said', () => {
    const text =
      '\nMultiple major-bodies match string "MARS*"\n\n  ID#      Name\n  4        Mars Barycenter\n';
    expect(() => parseHorizonsTable(text)).toThrow(HorizonsError);
    expect(() => parseHorizonsTable(text)).toThrow('Multiple major-bodies');
  });

  it('rejects a row whose column count differs from the header', () => {
    const text = ['JDTDB, X, Y,', '*****', '$$SOE', '2451545.0, 1.0,', '$$EOE'].join('\n');
    expect(() => parseHorizonsTable(text)).toThrow('Expected 3 columns, got 2');
  });
});
