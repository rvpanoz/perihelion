import { loadSunOrientationFixtures } from '@perihelion/fixtures/golden';
import { describe, expect, it } from 'vitest';
import { earthHeliographicLatitudeRad } from './heliographic';
import { planetStateAt } from './planets';
import type { Vector3 } from './vector3';

const RAD_PER_DEG = Math.PI / 180;

/**
 * Worst |B0 − Horizons B0| over the 12 monthly 2026 samples (DE441), measured on 2026-10-02.
 * - pole: from Horizons' own Earth position, so only the IAU pole and the frame maths are tested; the residual is
 *   Horizons' 6-decimal print rounding (≤ 5e-7°) plus its light-time correction.
 * - endToEnd: from the engine's Earth–Moon barycentre, as the app will use it (EMB offset and Standish error).
 */
const MEASURED_MAX_ERROR_DEG = { pole: 6.96e-7, endToEnd: 5.84e-4 } as const;

/** Room for harmless numeric changes (operation order); real bugs move far more. */
const TOLERANCE_MARGIN = 1.25;

const { samples } = loadSunOrientationFixtures();

function worstErrorDeg(
  earthPositionAt: (sample: (typeof samples)[number]) => Readonly<Vector3>,
): number {
  return Math.max(
    ...samples.map((sample) =>
      Math.abs(
        earthHeliographicLatitudeRad(earthPositionAt(sample)) / RAD_PER_DEG -
          sample.earthHeliographicLatitudeDeg,
      ),
    ),
  );
}

describe("Earth's heliographic latitude B0 vs Horizons", () => {
  it("matches with Horizons' Earth position, which isolates the Sun's pole", () => {
    expect(worstErrorDeg((sample) => sample.earthPositionAu)).toBeLessThanOrEqual(
      MEASURED_MAX_ERROR_DEG.pole * TOLERANCE_MARGIN,
    );
  });

  it("matches end to end with the engine's Earth–Moon barycentre", () => {
    const engineEarth = (sample: (typeof samples)[number]) =>
      planetStateAt('earthMoonBarycenter', sample.jdTdb).positionAu;
    expect(worstErrorDeg(engineEarth)).toBeLessThanOrEqual(
      MEASURED_MAX_ERROR_DEG.endToEnd * TOLERANCE_MARGIN,
    );
  });
});
