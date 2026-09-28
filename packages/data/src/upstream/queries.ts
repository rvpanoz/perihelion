/** An upstream endpoint and the exact parameters we send it; the server and the recorder share these. */
export interface UpstreamQuery {
  baseUrl: string;
  params: Readonly<Record<string, string>>;
}

/** Inclusive UTC calendar dates, `YYYY-MM-DD`, as SBDB, CAD and DONKI all accept them. */
export interface DateWindow {
  startDate: string;
  endDate: string;
}

export const SBDB_QUERY_API_URL = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api';
export const CAD_API_URL = 'https://ssd-api.jpl.nasa.gov/cad.api';
export const DONKI_CME_API_URL = 'https://api.nasa.gov/DONKI/CME';

/**
 * Designation, name, osculating elements (epoch as JD TDB, e, a in AU, i/Ω/ω/M in degrees),
 * absolute magnitude H and SBDB orbit class. https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html
 */
export const SBDB_NEO_FIELDS = [
  'pdes',
  'name',
  'epoch',
  'e',
  'a',
  'i',
  'om',
  'w',
  'ma',
  'H',
  'class',
] as const;
export type SbdbNeoField = (typeof SBDB_NEO_FIELDS)[number];

export const DEFAULT_CLOSE_APPROACH_DAYS = 7;
export const DEFAULT_CME_DAYS = 30;

/** CAD's documented default, sent explicitly so an upstream default change cannot alter the list. */
const CAD_MAX_DISTANCE_AU = '0.05';
const DAY_MS = 86_400_000;

// Asteroids only: comets are parked (PLAN.md) and the engine rejects e ≥ 1. `full-prec` stops SBDB
// rounding the elements for us; we round deliberately in the normalizer instead.
export function sbdbNeoQuery(): UpstreamQuery {
  return {
    baseUrl: SBDB_QUERY_API_URL,
    params: {
      fields: SBDB_NEO_FIELDS.join(','),
      'sb-group': 'neo',
      'sb-kind': 'a',
      'full-prec': 'true',
    },
  };
}

export function cadQuery(window: DateWindow): UpstreamQuery {
  return {
    baseUrl: CAD_API_URL,
    params: {
      'date-min': window.startDate,
      'date-max': window.endDate,
      'dist-max': CAD_MAX_DISTANCE_AU,
      fullname: 'true',
    },
  };
}

/** DONKI takes the key in the query string, so any printed URL must go through redaction. */
export function donkiCmeQuery(window: DateWindow, apiKey: string): UpstreamQuery {
  return {
    baseUrl: DONKI_CME_API_URL,
    params: { startDate: window.startDate, endDate: window.endDate, api_key: apiKey },
  };
}

/** Days either side of today, so an approach that has just happened can still be replayed. */
export function closeApproachWindow(nowMs: number, days: number): DateWindow {
  return { startDate: utcDate(nowMs - days * DAY_MS), endDate: utcDate(nowMs + days * DAY_MS) };
}

export function cmeWindow(nowMs: number, days: number): DateWindow {
  return { startDate: utcDate(nowMs - days * DAY_MS), endDate: utcDate(nowMs) };
}

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
