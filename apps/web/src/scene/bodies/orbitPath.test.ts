import { PLANETS, planetElementsAt } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import {
  ORBIT_PATH_POINTS,
  ORBIT_PATH_REFRESH_DAYS,
  orbitPathIsStale,
  writeOrbitPath,
} from './orbitPath';

const J2000_JD_TDB = 2_451_545;

function radiusAt(path: Float32Array, index: number): number {
  return Math.hypot(path[index * 3] ?? 0, path[index * 3 + 1] ?? 0, path[index * 3 + 2] ?? 0);
}

describe('orbit path', () => {
  it.each(PLANETS)(
    'traces %s between perihelion and aphelion, starting at perihelion',
    (planet) => {
      const { semiMajorAxisAu: a, eccentricity: e } = planetElementsAt(planet, J2000_JD_TDB);
      const path = writeOrbitPath(
        { planet, jdTdb: J2000_JD_TDB },
        new Float32Array(ORBIT_PATH_POINTS * 3),
      );
      expect(radiusAt(path, 0) / (a * (1 - e))).toBeCloseTo(1, 6);
      for (let index = 0; index < ORBIT_PATH_POINTS; index += 1) {
        expect(radiusAt(path, index)).toBeGreaterThanOrEqual(a * (1 - e) * (1 - 1e-6));
        expect(radiusAt(path, index)).toBeLessThanOrEqual(a * (1 + e) * (1 + 1e-6));
      }
    },
  );

  it('is stale when never drawn or a refresh period old, in either direction', () => {
    expect(orbitPathIsStale(undefined, J2000_JD_TDB)).toBe(true);
    expect(orbitPathIsStale(J2000_JD_TDB, J2000_JD_TDB + ORBIT_PATH_REFRESH_DAYS)).toBe(true);
    expect(orbitPathIsStale(J2000_JD_TDB, J2000_JD_TDB - ORBIT_PATH_REFRESH_DAYS)).toBe(true);
    expect(orbitPathIsStale(J2000_JD_TDB, J2000_JD_TDB + 30)).toBe(false);
  });
});
