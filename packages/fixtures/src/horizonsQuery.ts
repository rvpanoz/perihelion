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

/** URLSearchParams percent-encodes ";", which Horizons would otherwise split the query on. */
export function horizonsUrl(params: URLSearchParams): string {
  return `${HORIZONS_API_URL}?${params.toString()}`;
}

function buildQuery(query: BodyQuery, tableParams: Record<string, string>): URLSearchParams {
  return new URLSearchParams({
    ...HORIZONS_FRAME_PARAMS,
    ...tableParams,
    COMMAND: `'${query.command}'`,
    TLIST: query.jdTdbList.map((jdTdb) => `'${jdTdb}'`).join(' '),
  });
}
