import type { NeoCatalog } from '@perihelion/data';
import { stateAtTime } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TIME_RANGE_JD_TDB } from '../../time/timeController';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { buildSwarmAttributes, neoElementsAt } from './swarmAttributes';
import { swarmHeliocentricPosition, swarmOrbitAt } from './swarmKepler';
import { catalogOf } from './swarmTestSupport';

/** 2026-09-30 0h TDB: stands in for the load time the app uses as its reference epoch. */
const REFERENCE_JD_TDB = 2_461_313.5;

/** Up to ten years either side of the reference epoch: where the swarm is watched most. */
const NEAR_ELAPSED_DAYS = [0, 1, 30, 365.25, -365.25, 3_652.5, -3_652.5];
/** The ends of the scrubbable range (1800 and 2050). */
const RANGE_END_ELAPSED_DAYS = [
  TIME_RANGE_JD_TDB.startJdTdb - REFERENCE_JD_TDB,
  TIME_RANGE_JD_TDB.endJdTdb - REFERENCE_JD_TDB,
];

const CROSS_CHECK_SEED = 20_260_930;
const SAMPLE_SIZE = 2_000;

const NAMED_SHAPES: Record<string, Partial<NeoCatalog>> = {
  'Amor (Eros-like)': { semiMajorAxisAu: [1.458], eccentricity: [0.223], inclinationDeg: [10.8] },
  'Aten (Apophis-like)': { semiMajorAxisAu: [0.923], eccentricity: [0.191], inclinationDeg: [3.3] },
  'Apollo, q = 0.14 AU (Phaethon-like)': {
    semiMajorAxisAu: [1.271],
    eccentricity: [0.89],
    inclinationDeg: [22.3],
  },
  Atira: { semiMajorAxisAu: [0.74], eccentricity: [0.32], inclinationDeg: [25] },
  'eccentricity at the clamp': { semiMajorAxisAu: [2], eccentricity: [0.99], inclinationDeg: [5] },
  'high inclination': { semiMajorAxisAu: [1.8], eccentricity: [0.4], inclinationDeg: [70] },
};

const degrees = fc.double({ min: 0, max: 360, maxExcluded: true, noNaN: true });
const sampledNeo = fc
  .record({
    semiMajorAxisAu: fc.double({ min: 0.5, max: 4, noNaN: true }),
    eccentricity: fc.double({ min: 0, max: 0.99, noNaN: true }),
    inclinationDeg: fc.double({ min: 0, max: 90, noNaN: true }),
    longitudeOfAscendingNodeDeg: degrees,
    argumentOfPerihelionDeg: degrees,
    meanAnomalyDeg: degrees,
    epochOffsetDays: fc.double({ min: -5_000, max: 5_000, noNaN: true }),
  })
  .map(({ epochOffsetDays, ...elements }) =>
    catalogOf({
      semiMajorAxisAu: [elements.semiMajorAxisAu],
      eccentricity: [elements.eccentricity],
      inclinationDeg: [elements.inclinationDeg],
      longitudeOfAscendingNodeDeg: [elements.longitudeOfAscendingNodeDeg],
      argumentOfPerihelionDeg: [elements.argumentOfPerihelionDeg],
      meanAnomalyDeg: [elements.meanAnomalyDeg],
      epochJdTdb: [REFERENCE_JD_TDB + epochOffsetDays],
    }),
  );

const CROSS_CHECKED_NEOS: readonly NeoCatalog[] = [
  ...Object.values(NAMED_SHAPES).map((shape) => catalogOf(shape)),
  ...fc.sample(sampledNeo, { seed: CROSS_CHECK_SEED, numRuns: SAMPLE_SIZE }),
];

/** Distance (AU) between the float32 port and the float64 engine for one NEO, `elapsedDays` after the reference. */
function portErrorAu(catalog: NeoCatalog, elapsedDays: number): number {
  const orbit = swarmOrbitAt(buildSwarmAttributes(catalog, REFERENCE_JD_TDB), 0);
  const portAu = swarmHeliocentricPosition(orbit, elapsedDays);
  const engineState = stateAtTime(neoElementsAt(catalog, 0), REFERENCE_JD_TDB + elapsedDays);
  const engineAu = sceneAxesFromEcliptic(engineState.positionAu);
  return Math.hypot(portAu[0] - engineAu[0], portAu[1] - engineAu[1], portAu[2] - engineAu[2]);
}

function worstErrorAu(elapsedDays: readonly number[]): number {
  return Math.max(
    ...CROSS_CHECKED_NEOS.flatMap((catalog) =>
      elapsedDays.map((days) => portErrorAu(catalog, days)),
    ),
  );
}

/**
 * Worst float32 error (AU) over the seeded sample, measured on 2026-09-30. See
 * docs/accuracy.md. The margin is room for harmless changes (statement order, a GPU's fused multiply-adds);
 * a solver or precision bug moves far more.
 */
const MEASURED_MAX_ERROR_AU = { near: 1.37e-5, rangeEnds: 3.78e-4 };
const TOLERANCE_MARGIN = 1.25;

describe('GPU vs CPU cross-check', () => {
  it('matches the engine within ten years of the reference epoch', () => {
    expect(worstErrorAu(NEAR_ELAPSED_DAYS)).toBeLessThan(
      MEASURED_MAX_ERROR_AU.near * TOLERANCE_MARGIN,
    );
  });

  it('matches the engine at the ends of the scrubbable range', () => {
    expect(worstErrorAu(RANGE_END_ELAPSED_DAYS)).toBeLessThan(
      MEASURED_MAX_ERROR_AU.rangeEnds * TOLERANCE_MARGIN,
    );
  });

  it('samples every named shape plus the seeded NEOs', () => {
    expect(CROSS_CHECKED_NEOS).toHaveLength(Object.keys(NAMED_SHAPES).length + SAMPLE_SIZE);
  });
});
