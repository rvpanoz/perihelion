import type { CloseApproach } from '../closeApproach';
import {
  type Cell,
  type JplColumnarResponse,
  readColumnarRows,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readString,
} from './cells';

/** Fields CAD returns with `fullname=true`. */
export const CAD_FIELDS = [
  'des',
  'orbit_id',
  'jd',
  'cd',
  'dist',
  'dist_min',
  'dist_max',
  'v_rel',
  'v_inf',
  't_sigma_f',
  'h',
  'fullname',
] as const;
type CadCells = Record<(typeof CAD_FIELDS)[number], Cell>;

/** A bad row fails the whole list: these are displayed facts, so a partial list is worse than a fallback. */
export function toCloseApproaches(response: JplColumnarResponse): CloseApproach[] {
  return readColumnarRows(response, CAD_FIELDS)
    .map(toCloseApproach)
    .toSorted((a, b) => a.approachJdTdb - b.approachJdTdb);
}

function toCloseApproach(cells: CadCells): CloseApproach {
  return {
    designation: readString(cells.des, 'des'),
    fullName: readString(cells.fullname, 'fullname'),
    orbitId: readString(cells.orbit_id, 'orbit_id'),
    approachJdTdb: readNumber(cells.jd, 'jd'),
    approachCalendarTdb: readString(cells.cd, 'cd'),
    distanceAu: readNumber(cells.dist, 'dist'),
    distanceMinAu: readNumber(cells.dist_min, 'dist_min'),
    distanceMaxAu: readNumber(cells.dist_max, 'dist_max'),
    relativeVelocityKmPerS: readNumber(cells.v_rel, 'v_rel'),
    infinityVelocityKmPerS: readOptionalNumber(cells.v_inf, 'v_inf'),
    timeUncertainty: readOptionalString(cells.t_sigma_f),
    absoluteMagnitude: readOptionalNumber(cells.h, 'h'),
  };
}
