import { describe, expect, it } from 'vitest';
import { readColumnarRows, readNumber, readOptionalNumber, readOptionalString } from './cells';
import { UpstreamFormatError } from './upstreamFormatError';

const response = (fields: string[], data: (string | null)[][]) => ({
  signature: { version: '1.0' },
  count: data.length,
  fields,
  data,
});

describe('readColumnarRows', () => {
  it('keys each row by field name, whatever order upstream sends the columns in', () => {
    const rows = readColumnarRows(response(['b', 'a'], [['2', '1']]), ['a', 'b']);
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns no rows for an empty answer that carries no fields', () => {
    expect(readColumnarRows({ ...response([], []), count: 0 }, ['a'])).toEqual([]);
  });

  it('fails loudly when upstream reports matches but sends no rows', () => {
    // Shaped like a renamed `data` key: the envelope parses, count says 5, nothing is there.
    const drifted = { ...response([], []), count: 5 };
    expect(() => readColumnarRows(drifted, ['a'])).toThrow(UpstreamFormatError);
  });

  it('fails loudly when a required field is missing', () => {
    expect(() => readColumnarRows(response(['b'], [['2']]), ['a'])).toThrow(UpstreamFormatError);
  });

  it('rejects a row whose length differs from the field list', () => {
    expect(() => readColumnarRows(response(['a', 'b'], [['1']]), ['a'])).toThrow(
      'Expected 2 cells, got 1',
    );
  });
});

describe('cell parsing', () => {
  it('reads numbers from strings and numbers', () => {
    expect(readNumber('0.0123', 'dist')).toBe(0.0123);
    expect(readNumber(7, 'h')).toBe(7);
  });

  it('never reads an empty, blank or null cell as zero', () => {
    for (const cell of ['', '  ', null]) expect(() => readNumber(cell, 'dist')).toThrow('dist');
    expect(readOptionalNumber(' ', 'h')).toBeNull();
    expect(() => readNumber('n/a', 'dist')).toThrow(UpstreamFormatError);
  });

  it('trims strings and treats blank as absent', () => {
    expect(readOptionalString('   (2026 AB)')).toBe('(2026 AB)');
    expect(readOptionalString('  ')).toBeNull();
  });
});
