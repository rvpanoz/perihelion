import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STAR_HEADER_BYTES, STAR_RECORD_BYTES, unpackStars } from '../src/scene/stars/starPacking';

/**
 * The committed catalog is ground truth, like a Horizons fixture: it is checked against published positions, not
 * against the code that wrote it. Regenerating it with `npm run stars` and moving a star here means the sky moved,
 * which is a thing to look at, not a tolerance to loosen.
 *
 * Indices follow HR order at or brighter than magnitude 6.5, which is how `generateStarfield.ts` sorts the query.
 * It lives beside the generator because it reads the written file from disk, which the browser app never does.
 */
const STARS = [
  {
    name: 'Sirius (HR 2491)',
    index: 2289,
    // Ecliptic J2000, from the Bright Star Catalogue's own J2000 equatorial position.
    longitudeDeg: 104.07,
    latitudeDeg: -39.6,
    vmag: -1.46,
  },
];

/** The Big Dipper's pointers, and the separation every star atlas gives for them. */
const DUBHE_INDEX = 3947;
const MERAK_INDEX = 3941;
const POINTER_SEPARATION_DEG = 5.37;

/** Brightest first, so a resorted or refiltered file shows up here rather than on screen. */
const MAGNITUDES = [
  { name: 'Betelgeuse (HR 2061)', index: 1909, vmag: 0.45, bvColor: 1.85 },
  { name: 'Dubhe (HR 4301)', index: DUBHE_INDEX, vmag: 1.79, bvColor: 1.07 },
  { name: 'Merak (HR 4295)', index: MERAK_INDEX, vmag: 2.37, bvColor: 0.03 },
];

const catalog = (() => {
  const file = readFileSync(new URL('../public/stars/bsc5p-v1.bin', import.meta.url));
  return unpackStars(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
})();

function directionOf(index: number): [number, number, number] {
  const [x, y, z] = catalog.directions.subarray(index * 3, index * 3 + 3);
  return [x ?? 0, y ?? 0, z ?? 0];
}

function eclipticDegrees(index: number): { longitudeDeg: number; latitudeDeg: number } {
  const [x, y, z] = directionOf(index);
  const degrees = 180 / Math.PI;
  return {
    longitudeDeg: (Math.atan2(y, x) * degrees + 360) % 360,
    latitudeDeg: Math.asin(z) * degrees,
  };
}

describe('the committed star catalog', () => {
  it('holds the whole naked-eye sky, one record a star', () => {
    expect(catalog.count).toBe(8404);
    expect(STAR_HEADER_BYTES + catalog.count * STAR_RECORD_BYTES).toBe(67_244);
  });

  it.each(STARS)('puts $name where the catalogue says it is', (star) => {
    const { longitudeDeg, latitudeDeg } = eclipticDegrees(star.index);
    expect(longitudeDeg).toBeCloseTo(star.longitudeDeg, 1);
    expect(latitudeDeg).toBeCloseTo(star.latitudeDeg, 1);
    expect(catalog.vmags[star.index] ?? Number.NaN).toBeCloseTo(star.vmag, 1);
  });

  it.each(MAGNITUDES)('draws $name at its own brightness and colour', (star) => {
    expect(catalog.vmags[star.index] ?? Number.NaN).toBeCloseTo(star.vmag, 1);
    expect(catalog.bvColors[star.index] ?? Number.NaN).toBeCloseTo(star.bvColor, 1);
  });

  it('keeps the Big Dipper’s pointers the right distance apart', () => {
    const [dubheX, dubheY, dubheZ] = directionOf(DUBHE_INDEX);
    const [merakX, merakY, merakZ] = directionOf(MERAK_INDEX);
    const cosine = dubheX * merakX + dubheY * merakY + dubheZ * merakZ;
    const separationDeg = (Math.acos(Math.min(1, cosine)) * 180) / Math.PI;
    expect(separationDeg).toBeCloseTo(POINTER_SEPARATION_DEG, 1);
  });
});
