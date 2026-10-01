/** JPL Horizons API endpoint; used only by the dev-time fixture generator, never by tests. */
export const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/**
 * Pins Horizons to the engine's conventions: Sun body centre (Standish elements and the engine are
 * heliocentric, not barycentric), ecliptic and equinox of J2000, AU and days, TDB.
 * https://ssd-api.jpl.nasa.gov/doc/horizons.html
 */
export const HORIZONS_FRAME_PARAMS: Readonly<Record<string, string>> = {
  format: 'json',
  CENTER: "'500@10'",
  REF_PLANE: 'ECLIPTIC',
  REF_SYSTEM: 'ICRF',
  OUT_UNITS: 'AU-D',
  TIME_TYPE: 'TDB',
  TLIST_TYPE: 'JD',
  CSV_FORMAT: 'YES',
  OBJ_DATA: 'NO',
  MAKE_EPHEM: 'YES',
};

export interface BodyQuery {
  /** Horizons COMMAND: a major-body ID such as "3", or a small-body number plus ";" such as "433;". */
  command: string;
  jdTdbList: readonly number[];
}

// Geometric states are Horizons' default today; pinning it keeps the ground truth off an upstream default.
export function buildVectorsQuery(query: BodyQuery): URLSearchParams {
  return buildQuery(query, { EPHEM_TYPE: 'VECTORS', VEC_TABLE: '2', VEC_CORR: 'NONE' });
}

export function buildElementsQuery(query: BodyQuery): URLSearchParams {
  return buildQuery(query, { EPHEM_TYPE: 'ELEMENTS' });
}

/**
 * The Sun seen from Earth's centre. Quantity 14 is the observer sub-point on the target; for the Sun its latitude is
 * Earth's heliographic latitude B0 (Horizons models the Sun as a sphere, so planetodetic = heliographic). Observer
 * tables take TT, not TDB (TT = TDB within 1.7 ms, PROGRESS.md 2026-09-28); CAL_FORMAT=JD prints the date as a JD
 * so the generator can check it got the dates it asked for.
 */
export const SUN_OBSERVER_PARAMS: Readonly<Record<string, string>> = {
  format: 'json',
  COMMAND: "'10'",
  CENTER: "'500@399'",
  EPHEM_TYPE: 'OBSERVER',
  QUANTITIES: "'14'",
  TIME_TYPE: 'TT',
  TLIST_TYPE: 'JD',
  CAL_FORMAT: 'JD',
  ANG_FORMAT: 'DEG',
  EXTRA_PREC: 'YES',
  CSV_FORMAT: 'YES',
  OBJ_DATA: 'NO',
  MAKE_EPHEM: 'YES',
};

export function buildSunObserverQuery(jdTtList: readonly number[]): URLSearchParams {
  return new URLSearchParams({ ...SUN_OBSERVER_PARAMS, TLIST: quotedTimeList(jdTtList) });
}

/** URLSearchParams percent-encodes ";", which Horizons would otherwise split the query on. */
export function horizonsUrl(params: URLSearchParams): string {
  return `${HORIZONS_API_URL}?${params.toString()}`;
}

function buildQuery(query: BodyQuery, tableParams: Record<string, string>): URLSearchParams {
  return new URLSearchParams({
    ...HORIZONS_FRAME_PARAMS,
    ...tableParams,
    COMMAND: `'${query.command}'`,
    TLIST: quotedTimeList(query.jdTdbList),
  });
}

function quotedTimeList(julianDates: readonly number[]): string {
  return julianDates.map((julianDate) => `'${julianDate}'`).join(' ');
}
