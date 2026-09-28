import { describe, expect, it } from 'vitest';
import { buildElementsQuery, buildVectorsQuery, horizonsUrl } from './horizonsQuery';

describe('buildVectorsQuery', () => {
  const params = buildVectorsQuery({ command: '3', jdTdbList: [2451545, 2378496.5] });

  it('asks for heliocentric ecliptic J2000 states in AU and AU/day on TDB', () => {
    expect(params.get('EPHEM_TYPE')).toBe('VECTORS');
    expect(params.get('VEC_TABLE')).toBe('2');
    expect(params.get('CENTER')).toBe("'500@10'");
    expect(params.get('REF_PLANE')).toBe('ECLIPTIC');
    expect(params.get('REF_SYSTEM')).toBe('ICRF');
    expect(params.get('OUT_UNITS')).toBe('AU-D');
    expect(params.get('TIME_TYPE')).toBe('TDB');
    expect(params.get('CSV_FORMAT')).toBe('YES');
    expect(params.get('format')).toBe('json');
  });

  it('asks for geometric states with no light-time or aberration correction', () => {
    expect(params.get('VEC_CORR')).toBe('NONE');
  });

  it('quotes the command and each Julian Date in the time list', () => {
    expect(params.get('COMMAND')).toBe("'3'");
    expect(params.get('TLIST_TYPE')).toBe('JD');
    expect(params.get('TLIST')).toBe("'2451545' '2378496.5'");
  });
});

describe('buildElementsQuery', () => {
  it('asks for osculating elements in the same frame, without a vector table', () => {
    const params = buildElementsQuery({ command: '433;', jdTdbList: [2461000.5] });
    expect(params.get('EPHEM_TYPE')).toBe('ELEMENTS');
    expect(params.get('VEC_TABLE')).toBeNull();
    expect(params.get('CENTER')).toBe("'500@10'");
    expect(params.get('REF_PLANE')).toBe('ECLIPTIC');
  });
});

describe('horizonsUrl', () => {
  it('percent-encodes the small-body semicolon, which Horizons otherwise rejects as an unknown parameter', () => {
    const url = horizonsUrl(buildElementsQuery({ command: '433;', jdTdbList: [2461000.5] }));
    expect(url.startsWith('https://ssd.jpl.nasa.gov/api/horizons.api?')).toBe(true);
    expect(url).toContain('COMMAND=%27433%3B%27');
    expect(url).not.toContain(';');
  });
});
