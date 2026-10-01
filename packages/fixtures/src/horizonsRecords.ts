import type { ElementsRecord, StateRecord } from './fixtureSchema';
import { HorizonsError } from './horizonsResponse';
import type { HorizonsRow } from './horizonsTable';

export function toStateRecord(row: HorizonsRow): StateRecord {
  return {
    jdTdb: readNumber(row, 'JDTDB'),
    positionAu: [readNumber(row, 'X'), readNumber(row, 'Y'), readNumber(row, 'Z')],
    velocityAuPerDay: [readNumber(row, 'VX'), readNumber(row, 'VY'), readNumber(row, 'VZ')],
  };
}

/** Column names from the Horizons elements table legend (EC, QR, IN, OM, W, Tp, N, MA, TA, A). */
export function toElementsRecord(row: HorizonsRow): ElementsRecord {
  return {
    epochJdTdb: readNumber(row, 'JDTDB'),
    eccentricity: readNumber(row, 'EC'),
    perihelionDistanceAu: readNumber(row, 'QR'),
    inclinationDeg: readNumber(row, 'IN'),
    longitudeOfAscendingNodeDeg: readNumber(row, 'OM'),
    argumentOfPerihelionDeg: readNumber(row, 'W'),
    timeOfPerihelionJdTdb: readNumber(row, 'Tp'),
    meanMotionDegPerDay: readNumber(row, 'N'),
    meanAnomalyDeg: readNumber(row, 'MA'),
    trueAnomalyDeg: readNumber(row, 'TA'),
    semiMajorAxisAu: readNumber(row, 'A'),
  };
}

/** One row of the Sun-as-seen-from-Earth observer table. */
export interface SunObserverRecord {
  jdTt: number;
  earthHeliographicLatitudeDeg: number;
}

/** Column names from the observer table header with CAL_FORMAT=JD and quantity 14. */
export function toSunObserverRecord(row: HorizonsRow): SunObserverRecord {
  return {
    jdTt: readNumber(row, 'Date_________JDTT'),
    earthHeliographicLatitudeDeg: readNumber(row, 'ObsSub-LAT'),
  };
}

/** Number('') is 0, so empty fields are rejected explicitly rather than read as zero. */
function readNumber(row: HorizonsRow, column: string): number {
  const field = row[column];
  const value = field === undefined || field === '' ? Number.NaN : Number(field);
  if (!Number.isFinite(value)) {
    throw new HorizonsError(`Column ${column} is not a number: "${field ?? ''}"`);
  }
  return value;
}
