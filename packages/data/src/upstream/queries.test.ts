import { describe, expect, it } from 'vitest';
import {
  SBDB_NEO_FIELDS,
  cadQuery,
  sbdbObjectQuery,
  closeApproachWindow,
  cmeWindow,
  donkiCmeQuery,
  sbdbNeoQuery,
} from './queries';

const NOW_MS = Date.UTC(2026, 8, 28, 23, 59);

describe('sbdbNeoQuery', () => {
  it('asks for near-Earth asteroids at full precision with the fields the normalizer reads', () => {
    const { baseUrl, params } = sbdbNeoQuery();
    expect(baseUrl).toBe('https://ssd-api.jpl.nasa.gov/sbdb_query.api');
    expect(params).toEqual({
      fields: SBDB_NEO_FIELDS.join(','),
      'sb-group': 'neo',
      'sb-kind': 'a',
      'full-prec': 'true',
    });
  });
});

describe('cadQuery', () => {
  it('pins the distance cut-off and asks for asteroids with full names and diameters', () => {
    const { baseUrl, params } = cadQuery({ startDate: '2026-09-21', endDate: '2026-10-05' });
    expect(baseUrl).toBe('https://ssd-api.jpl.nasa.gov/cad.api');
    expect(params).toEqual({
      'date-min': '2026-09-21',
      'date-max': '2026-10-05',
      'dist-max': '0.05',
      kind: 'a',
      fullname: 'true',
      diameter: 'true',
    });
  });
});

describe('sbdbObjectQuery', () => {
  it('looks one object up by its exact designation, at full precision', () => {
    expect(sbdbObjectQuery('2026 SY')).toEqual({
      baseUrl: 'https://ssd-api.jpl.nasa.gov/sbdb.api',
      params: { des: '2026 SY', 'full-prec': 'true' },
    });
  });
});

describe('donkiCmeQuery', () => {
  it('passes the window and the API key', () => {
    const query = donkiCmeQuery({ startDate: '2026-08-29', endDate: '2026-09-28' }, 'KEY');
    expect(query.baseUrl).toBe('https://api.nasa.gov/DONKI/CME');
    expect(query.params).toEqual({
      startDate: '2026-08-29',
      endDate: '2026-09-28',
      api_key: 'KEY',
    });
  });
});

describe('date windows', () => {
  it('spans days either side of today (UTC) for close approaches', () => {
    expect(closeApproachWindow(NOW_MS, 7)).toEqual({
      startDate: '2026-09-21',
      endDate: '2026-10-05',
    });
  });

  it('crosses month and year boundaries', () => {
    expect(closeApproachWindow(Date.UTC(2026, 11, 30), 7)).toEqual({
      startDate: '2026-12-23',
      endDate: '2027-01-06',
    });
  });

  it('ends today for CMEs, which are only known after they happen', () => {
    expect(cmeWindow(NOW_MS, 30)).toEqual({ startDate: '2026-08-29', endDate: '2026-09-28' });
  });
});
