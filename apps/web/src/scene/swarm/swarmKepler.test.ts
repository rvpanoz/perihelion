import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildSwarmAttributes } from './swarmAttributes';
import swarmKeplerGlsl from './swarmKepler.glsl?raw';
import {
  SWARM_NEWTON_STEPS,
  swarmEccentricAnomaly,
  swarmHeliocentricPosition,
  swarmOrbitAt,
} from './swarmKepler';
import { J2000_JD_TDB, catalogOf, expectCloseTo } from './swarmTestSupport';

const GAUSSIAN_K_RAD_PER_DAY = 0.01720209895;

/**
 * About 40 float32 steps at E = π. Converged answers sit near 1e-7; one Newton step short of converged at
 * e = 0.99 is ~1e-3, so this separates the two cleanly.
 */
const KEPLER_RESIDUAL_TOLERANCE_RAD = 1e-5;

/** Kepler's equation, in float64, on the solver's float32 answer; M is centred on [−π, π) as the solver does. */
function keplerResidualRad(meanAnomalyRad: number, eccentricity: number): number {
  const eccentricAnomalyRad = swarmEccentricAnomaly(meanAnomalyRad, eccentricity);
  const centredRad = meanAnomalyRad >= Math.PI ? meanAnomalyRad - 2 * Math.PI : meanAnomalyRad;
  return eccentricAnomalyRad - eccentricity * Math.sin(eccentricAnomalyRad) - centredRad;
}

const float32MeanAnomalyRad = fc
  .double({ min: 0, max: 2 * Math.PI, maxExcluded: true, noNaN: true })
  .map(Math.fround);
const float32Eccentricity = fc.double({ min: 0, max: 0.99, noNaN: true }).map(Math.fround);

describe('swarmEccentricAnomaly', () => {
  it('solves Kepler’s equation to float32 precision for every e ≤ 0.99', () => {
    fc.assert(
      fc.property(float32MeanAnomalyRad, float32Eccentricity, (meanAnomalyRad, eccentricity) => {
        expect(Math.abs(keplerResidualRad(meanAnomalyRad, eccentricity))).toBeLessThan(
          KEPLER_RESIDUAL_TOLERANCE_RAD,
        );
      }),
      { numRuns: 10_000 },
    );
  });

  it.each([
    ['e = 0.99 just past perihelion', 1e-6, 0.99],
    ['e = 0.99, M = 0.001', 1e-3, 0.99],
    ['e = 0.99, M = 0.05', 0.05, 0.99],
    ['e = 0.99 just before aphelion', Math.PI - 1e-4, 0.99],
    ['e = 0.99 just before perihelion', 2 * Math.PI - 1e-3, 0.99],
    ['a circle', 1, 0],
    ['e = 0.5 at aphelion', Math.PI, 0.5],
  ])('converges for %s', (_case, meanAnomalyRad, eccentricity) => {
    const residualRad = keplerResidualRad(Math.fround(meanAnomalyRad), Math.fround(eccentricity));
    expect(Math.abs(residualRad)).toBeLessThan(KEPLER_RESIDUAL_TOLERANCE_RAD);
  });

  it('returns float32 values, as the GPU would', () => {
    fc.assert(
      fc.property(float32MeanAnomalyRad, float32Eccentricity, (meanAnomalyRad, eccentricity) => {
        const eccentricAnomalyRad = swarmEccentricAnomaly(meanAnomalyRad, eccentricity);
        expect(Math.fround(eccentricAnomalyRad)).toBe(eccentricAnomalyRad);
      }),
    );
  });
});

describe('swarmHeliocentricPosition', () => {
  it('moves a circular ecliptic orbit a quarter revolution in a quarter period', () => {
    const catalog = catalogOf({ eccentricity: [0], semiMajorAxisAu: [1], meanAnomalyDeg: [90] });
    const orbit = swarmOrbitAt(buildSwarmAttributes(catalog, J2000_JD_TDB), 0);
    // Scene axes are ecliptic (x, z, −y): M = 90° is ecliptic +y, M = 180° is ecliptic −x.
    expectCloseTo(swarmHeliocentricPosition(orbit, 0), [0, 0, -1], 5);
    const quarterPeriodDays = Math.PI / 2 / GAUSSIAN_K_RAD_PER_DAY;
    expectCloseTo(swarmHeliocentricPosition(orbit, quarterPeriodDays), [-1, 0, 0], 5);
  });

  it('stays between perihelion and aphelion distance at any time in the scrubbable range', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        fc.double({ min: 0.5, max: 4, noNaN: true }),
        fc.double({ min: -90_000, max: 90_000, noNaN: true }),
        (eccentricity, semiMajorAxisAu, elapsedDays) => {
          const catalog = catalogOf({
            eccentricity: [eccentricity],
            semiMajorAxisAu: [semiMajorAxisAu],
          });
          const orbit = swarmOrbitAt(buildSwarmAttributes(catalog, J2000_JD_TDB), 0);
          const distanceAu = Math.hypot(...swarmHeliocentricPosition(orbit, elapsedDays));
          const float32SlackAu = 1e-6 * semiMajorAxisAu;
          expect(distanceAu).toBeGreaterThan(semiMajorAxisAu * (1 - eccentricity) - float32SlackAu);
          expect(distanceAu).toBeLessThan(semiMajorAxisAu * (1 + eccentricity) + float32SlackAu);
        },
      ),
    );
  });
});

describe('swarmKepler.glsl', () => {
  it('takes as many Newton steps as the JS port', () => {
    expect(swarmKeplerGlsl).toContain(`const int SWARM_NEWTON_STEPS = ${SWARM_NEWTON_STEPS};`);
  });

  it.each([
    'swarmCentredAnomaly',
    'swarmKeplerStart',
    'swarmEccentricAnomaly',
    'swarmHeliocentricPosition',
  ])('defines %s, as the port does', (functionName) => {
    expect(swarmKeplerGlsl).toMatch(new RegExp(`\\b${functionName}\\(`));
  });
});
