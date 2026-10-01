import {
  type ApproachOrbit,
  type CadApproach,
  indexCatalogOrbits,
  jplColumnarResponseSchema,
  sbdbObjectResponseSchema,
  toCloseApproaches,
  toLookedUpOrbit,
  toNeoCatalog,
} from '@perihelion/data';
import { RECORDED_CAD_WINDOW, RECORDED_SBDB_OBJECT_LOOKUPS } from '@perihelion/fixtures/upstream';
import { loadFullSbdbNeoResponse } from '@perihelion/fixtures/upstream-full';
import { KM_PER_AU, closestApproach, elementsFromDegrees } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';

const MINUTES_PER_DAY = 1440;

interface CrossCheckRow {
  designation: string;
  deltaKm: number;
  deltaMinutes: number;
}

const catalogOrbits = indexCatalogOrbits(
  toNeoCatalog(jplColumnarResponseSchema.parse(loadFullSbdbNeoResponse())),
);
const recordedLookups: Readonly<Record<string, unknown>> = isRecord(RECORDED_SBDB_OBJECT_LOOKUPS)
  ? RECORDED_SBDB_OBJECT_LOOKUPS
  : {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The orbit the server would attach: the recorded catalogue first, then the recorded SBDB lookup. */
function recordedOrbit(designation: string): ApproachOrbit | undefined {
  const fromCatalog = catalogOrbits.get(designation)?.orbit;
  if (fromCatalog !== undefined) return fromCatalog;
  const lookup = recordedLookups[designation];
  if (lookup === undefined) return undefined;
  return toLookedUpOrbit(sbdbObjectResponseSchema.parse(lookup))?.orbit;
}

/** CAD's distance is geocentric; the engine's is from the Earth–Moon barycentre, two-body from the SBDB epoch. */
function measure(approach: CadApproach): CrossCheckRow {
  const orbit = recordedOrbit(approach.designation);
  if (orbit === undefined) throw new Error(`No recorded orbit for ${approach.designation}`);
  const engine = closestApproach(elementsFromDegrees(orbit), approach.approachJdTdb);
  const deltaAu = engine.distanceAu - approach.distanceAu;
  return {
    designation: approach.designation,
    deltaKm: deltaAu * KM_PER_AU,
    deltaMinutes: (engine.jdTdb - approach.approachJdTdb) * MINUTES_PER_DAY,
  };
}

/**
 * Measured worst × 1.25 over the 19 recorded rows (worst |Δd| 12,509 km, 2026 RN15; worst |Δt| 68.8 min, 2026 SA8).
 * Absolute, not relative: the error does not scale with distance. It is what two-body heliocentric motion leaves
 * out (Earth's pull, ~GM⊕/v∞², plus drift from the SBDB epoch) and the barycentre offset (up to 4,670 km).
 * The engine only places the marker and trail; the distance, speed and date shown come from CAD.
 */
const MAX_DISTANCE_DELTA_KM = 15_700;
const MAX_TIME_DELTA_MINUTES = 86;

describe('engine closest approach vs JPL CAD', () => {
  const approaches = toCloseApproaches(jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW));
  const rows = approaches.map(measure);

  it('finds a recorded orbit for every recorded CAD row', () => {
    expect(rows).toHaveLength(approaches.length);
  });

  it.each(rows)('$designation: the engine matches CAD within the calibrated tolerance', (row) => {
    expect(Math.abs(row.deltaKm)).toBeLessThanOrEqual(MAX_DISTANCE_DELTA_KM);
    expect(Math.abs(row.deltaMinutes)).toBeLessThanOrEqual(MAX_TIME_DELTA_MINUTES);
  });
});
