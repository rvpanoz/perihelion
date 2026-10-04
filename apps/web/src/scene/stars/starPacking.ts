import { equatorialToEcliptic } from '@perihelion/orbit';

/**
 * The bundled star catalog's wire format. Stars never move on human timescales, so the file holds a direction and
 * a brightness and nothing else: an int16 unit vector plus a magnitude and a colour index, eight bytes a star, which
 * is ~67 KB for the naked-eye sky. It is fetched after first paint, like the Earth map, so nothing lands in the
 * initial download.
 *
 * Source: the Yale Bright Star Catalogue (`bsc5p`) from NASA HEASARC, whose `ra`/`dec` are J2000 degrees.
 * `scripts/generateStarfield.ts` writes the file; this module is the only place that knows the layout.
 */
export const STAR_HEADER_BYTES = 12;
export const STAR_RECORD_BYTES = 8;
export const STAR_FILE_VERSION = 1;

/** 'PSTR', so a truncated or mis-served file fails loudly instead of drawing noise. */
const STAR_FILE_MAGIC = 0x50535452;

/** int16 full scale: a direction quantises to ~3e-5, about 6 arcseconds. */
const DIRECTION_SCALE = 32767;
/** The brightest star is Sirius at −1.46, so the offset keeps the stored magnitude unsigned. */
const VMAG_OFFSET = 2;
const VMAG_SCALE = 16;
/** B−V runs about −0.4 (blue) to 2.5 (red), so ×50 fits a signed byte at 0.02 a step. */
const BV_SCALE = 50;

export interface StarRow {
  raDeg: number;
  decDeg: number;
  vmag: number;
  bvColor: number;
}

export interface StarCatalog {
  count: number;
  /** Ecliptic J2000 unit vectors, three floats a star. */
  directions: Float32Array;
  vmags: Float32Array;
  bvColors: Float32Array;
}

/** Equatorial J2000 unit vector for a right ascension and declination in degrees. */
function equatorialUnitVector({ raDeg, decDeg }: StarRow): [number, number, number] {
  const raRad = (raDeg * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const cosDeclination = Math.cos(decRad);
  return [cosDeclination * Math.cos(raRad), cosDeclination * Math.sin(raRad), Math.sin(decRad)];
}

export function packStars(rows: readonly StarRow[]): Uint8Array {
  const bytes = new Uint8Array(STAR_HEADER_BYTES + rows.length * STAR_RECORD_BYTES);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, STAR_FILE_MAGIC);
  view.setUint16(4, STAR_FILE_VERSION);
  view.setUint16(6, STAR_RECORD_BYTES);
  view.setUint32(8, rows.length);
  rows.forEach((row, star) => {
    const ecliptic = equatorialToEcliptic(equatorialUnitVector(row));
    const record = STAR_HEADER_BYTES + star * STAR_RECORD_BYTES;
    for (const axis of [0, 1, 2]) {
      view.setInt16(record + axis * 2, Math.round((ecliptic[axis] ?? 0) * DIRECTION_SCALE));
    }
    view.setUint8(record + 6, clampByte((row.vmag + VMAG_OFFSET) * VMAG_SCALE, 0, 255));
    view.setInt8(record + 7, clampByte(row.bvColor * BV_SCALE, -128, 127));
  });
  return bytes;
}

export function unpackStars(buffer: ArrayBuffer): StarCatalog {
  const view = new DataView(buffer);
  if (view.byteLength < STAR_HEADER_BYTES || view.getUint32(0) !== STAR_FILE_MAGIC) {
    throw new Error('Not a star catalog file');
  }
  if (view.getUint16(4) !== STAR_FILE_VERSION) {
    throw new Error(`Star catalog version ${view.getUint16(4)} is not ${STAR_FILE_VERSION}`);
  }
  const count = view.getUint32(8);
  const catalog: StarCatalog = {
    count,
    directions: new Float32Array(count * 3),
    vmags: new Float32Array(count),
    bvColors: new Float32Array(count),
  };
  for (let star = 0; star < count; star += 1) {
    const record = STAR_HEADER_BYTES + star * STAR_RECORD_BYTES;
    for (const axis of [0, 1, 2]) {
      catalog.directions[star * 3 + axis] = view.getInt16(record + axis * 2) / DIRECTION_SCALE;
    }
    catalog.vmags[star] = view.getUint8(record + 6) / VMAG_SCALE - VMAG_OFFSET;
    catalog.bvColors[star] = view.getInt8(record + 7) / BV_SCALE;
  }
  return catalog;
}

function clampByte(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, Math.round(value)));
}
