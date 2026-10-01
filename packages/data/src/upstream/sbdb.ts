import { type NeoCatalog, type NeoOrbitClass, NEO_ORBIT_CLASSES } from '../neoCatalog';
import {
  type Cell,
  type JplColumnarResponse,
  readColumnarRows,
  readFiniteOrNull,
  readOptionalString,
} from './cells';
import { type SbdbNeoField, SBDB_NEO_FIELDS } from './queries';
import { UpstreamFormatError } from './upstreamFormatError';

/** More unusable rows than this means the format changed, not that a few orbits are odd. */
const MAX_SKIPPED_FRACTION = 0.01;

// Rounded to about a kilometre at 1 AU (a: 1e-8 AU ≈ 1.5 km; e: 1e-8; angles: 1e-6° ≈ 2.6 km), far
// below anything visible, so ~40k rows fit the gzip budget. Displayed facts never come from here.
const ELEMENT_DECIMALS = 8;
const ANGLE_DECIMALS = 6;
const MAGNITUDE_DECIMALS = 2;

type SbdbCells = Record<SbdbNeoField, Cell>;

export interface RawElements {
  epoch: number;
  e: number;
  a: number;
  i: number;
  om: number;
  w: number;
  ma: number;
}

interface NeoRow {
  designation: string;
  name: string | null;
  epochJdTdb: number;
  eccentricity: number;
  semiMajorAxisAu: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPerihelionDeg: number;
  meanAnomalyDeg: number;
  absoluteMagnitude: number | null;
  orbitClass: NeoOrbitClass;
}

export type Elements = Omit<NeoRow, 'designation' | 'name' | 'absoluteMagnitude' | 'orbitClass'>;

export function toNeoCatalog(response: JplColumnarResponse): NeoCatalog {
  const cells = readColumnarRows(response, SBDB_NEO_FIELDS);
  assertAnyRows(cells.length);
  const rows = cells.flatMap((row) => toNeoRow(row) ?? []);
  assertFewSkipped(cells.length, rows.length);
  return toColumns(rows);
}

/** Math.round on a scaled value, then one division: the result prints as the short decimal. */
export function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function toNeoRow(cells: SbdbCells): NeoRow | null {
  const orbitClass = NEO_ORBIT_CLASSES.find((neoClass) => neoClass === cells.class);
  const elements = toElements(readRawElements(cells));
  const designation = readOptionalString(cells.pdes);
  if (orbitClass === undefined || elements === null || designation === null) return null;
  const magnitude = readFiniteOrNull(cells.H);
  const absoluteMagnitude = magnitude === null ? null : roundTo(magnitude, MAGNITUDE_DECIMALS);
  return {
    designation,
    name: readOptionalString(cells.name),
    ...elements,
    absoluteMagnitude,
    orbitClass,
  };
}

function readRawElements(cells: SbdbCells): RawElements | null {
  const raw = {
    epoch: readFiniteOrNull(cells.epoch),
    e: readFiniteOrNull(cells.e),
    a: readFiniteOrNull(cells.a),
    i: readFiniteOrNull(cells.i),
    om: readFiniteOrNull(cells.om),
    w: readFiniteOrNull(cells.w),
    ma: readFiniteOrNull(cells.ma),
  };
  // Checked at runtime just above, so the narrowing cast is sound.
  return Object.values(raw).every((value) => value !== null) ? (raw as RawElements) : null;
}

/** The engine rejects e ≥ 1 (Phase 1 decision), so unbound orbits are skipped here. */
export function toElements(raw: RawElements | null): Elements | null {
  if (raw === null) return null;
  const eccentricity = roundTo(raw.e, ELEMENT_DECIMALS);
  const semiMajorAxisAu = roundTo(raw.a, ELEMENT_DECIMALS);
  // Checked after rounding: 0.999999996 becomes 1, which neoCatalogSchema rejects, so the check has to
  // see what we would emit.
  if (eccentricity >= 1 || semiMajorAxisAu <= 0) return null;
  return {
    epochJdTdb: raw.epoch,
    eccentricity,
    semiMajorAxisAu,
    inclinationDeg: roundTo(raw.i, ANGLE_DECIMALS),
    longitudeOfAscendingNodeDeg: roundTo(raw.om, ANGLE_DECIMALS),
    argumentOfPerihelionDeg: roundTo(raw.w, ANGLE_DECIMALS),
    meanAnomalyDeg: roundTo(raw.ma, ANGLE_DECIMALS),
  };
}

/** Unlike a CAD or DONKI window, an empty NEO catalog is never right: serving it would blank the swarm. */
function assertAnyRows(total: number): void {
  if (total === 0) throw new UpstreamFormatError('SBDB returned no NEO rows');
}

function assertFewSkipped(total: number, kept: number): void {
  if (total - kept > total * MAX_SKIPPED_FRACTION) {
    throw new UpstreamFormatError(`Skipped ${total - kept} of ${total} SBDB rows`);
  }
}

function toColumns(rows: readonly NeoRow[]): NeoCatalog {
  return {
    count: rows.length,
    designation: rows.map((row) => row.designation),
    name: rows.map((row) => row.name),
    epochJdTdb: rows.map((row) => row.epochJdTdb),
    eccentricity: rows.map((row) => row.eccentricity),
    semiMajorAxisAu: rows.map((row) => row.semiMajorAxisAu),
    inclinationDeg: rows.map((row) => row.inclinationDeg),
    longitudeOfAscendingNodeDeg: rows.map((row) => row.longitudeOfAscendingNodeDeg),
    argumentOfPerihelionDeg: rows.map((row) => row.argumentOfPerihelionDeg),
    meanAnomalyDeg: rows.map((row) => row.meanAnomalyDeg),
    absoluteMagnitude: rows.map((row) => row.absoluteMagnitude),
    orbitClass: rows.map((row) => row.orbitClass),
  };
}
