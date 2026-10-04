import { OBLIQUITY_J2000_RAD } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import {
  STAR_HEADER_BYTES,
  STAR_RECORD_BYTES,
  type StarRow,
  packStars,
  unpackStars,
} from './starPacking';

/** Sirius (HR 2491) as HEASARC's `bsc5p` gives it: J2000 degrees, visual magnitude, B−V. */
const SIRIUS: StarRow = { raDeg: 101.2871, decDeg: -16.7161, vmag: -1.46, bvColor: 0.0 };
const POLARIS: StarRow = { raDeg: 37.9545, decDeg: 89.2641, vmag: 2.02, bvColor: 0.6 };

/** int16 directions quantise to ~3e-5 of a unit vector, about 6 arcseconds: far under a pixel. */
const DIRECTION_TOLERANCE = 1e-4;

function unpackOne(row: StarRow) {
  const catalog = unpackStars(packStars([row]).buffer as ArrayBuffer);
  return {
    direction: Array.from(catalog.directions),
    vmag: catalog.vmags[0] ?? Number.NaN,
    bvColor: catalog.bvColors[0] ?? Number.NaN,
  };
}

describe('packStars', () => {
  it('is a header plus one fixed-size record per star', () => {
    expect(packStars([SIRIUS, POLARIS])).toHaveLength(STAR_HEADER_BYTES + 2 * STAR_RECORD_BYTES);
  });
});

describe('unpackStars', () => {
  it('turns right ascension and declination into an ecliptic J2000 unit vector', () => {
    const { direction } = unpackOne(SIRIUS);
    // Equatorial (x, y, z) for Sirius, rotated about x by the obliquity (Meeus eq. 13.5–13.6).
    const raRad = (SIRIUS.raDeg * Math.PI) / 180;
    const decRad = (SIRIUS.decDeg * Math.PI) / 180;
    const equatorial = [
      Math.cos(decRad) * Math.cos(raRad),
      Math.cos(decRad) * Math.sin(raRad),
      Math.sin(decRad),
    ] as const;
    const cos = Math.cos(OBLIQUITY_J2000_RAD);
    const sin = Math.sin(OBLIQUITY_J2000_RAD);
    const expected = [
      equatorial[0],
      cos * equatorial[1] + sin * equatorial[2],
      -sin * equatorial[1] + cos * equatorial[2],
    ];
    for (const axis of [0, 1, 2]) {
      expect(direction[axis] ?? Number.NaN).toBeCloseTo(expected[axis] ?? Number.NaN, 4);
    }
  });

  it.each([SIRIUS, POLARIS])('round-trips $vmag mag within the quantisation step', (row) => {
    const star = unpackOne(row);
    expect(star.vmag).toBeCloseTo(row.vmag, 1);
    expect(star.bvColor).toBeCloseTo(row.bvColor, 1);
    const length = Math.hypot(...star.direction);
    expect(length).toBeCloseTo(1, 3);
  });

  it('keeps every direction a unit vector', () => {
    const catalog = unpackStars(packStars([SIRIUS, POLARIS]).buffer as ArrayBuffer);
    expect(catalog.count).toBe(2);
    for (let star = 0; star < catalog.count; star += 1) {
      const direction = catalog.directions.subarray(star * 3, star * 3 + 3);
      expect(Math.hypot(...direction)).toBeCloseTo(1, 3);
    }
  });

  it('refuses a file that is not a star catalog', () => {
    const bytes = packStars([SIRIUS]);
    bytes[0] = 0;
    expect(() => unpackStars(bytes.buffer as ArrayBuffer)).toThrow(/star catalog/i);
  });
});

/** Named so the tolerance is a decision, not a magic number in an assertion. */
describe('direction quantisation', () => {
  it('is finer than a pixel at any zoom', () => {
    const { direction } = unpackOne(POLARIS);
    expect(Math.abs(Math.hypot(...direction) - 1)).toBeLessThan(DIRECTION_TOLERANCE);
  });
});
