import { type Cme, donkiCmeResponseSchema, toCmes } from '@perihelion/data';
import { RECORDED_DONKI_CME_WINDOW } from '@perihelion/fixtures/upstream';
import {
  type CmeFrontMotion,
  type CmeTiming,
  DONKI_MEASUREMENT_DISTANCE_AU,
  KM_PER_AU,
  cmeFrontDistanceAu,
  cmeFrontMotion,
  jdTdbFromJdUtc,
  jdUtcFromUnixMs,
  norm,
  planetStateAt,
} from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';

const SECONDS_PER_DAY = 86_400;

interface CrossCheckRow {
  activityId: string;
  timing: CmeTiming;
  motion: CmeFrontMotion;
}

function jdTdbFromIso(iso: string): number {
  return jdTdbFromJdUtc(jdUtcFromUnixMs(Date.parse(iso)));
}

function earthDistanceAt(jdTdb: number): number {
  return norm(planetStateAt('earthMoonBarycenter', jdTdb).positionAu);
}

function timingOf(cme: Cme): CmeTiming {
  const { analysis } = cme;
  return {
    time21_5JdTdb: jdTdbFromIso(analysis.time21_5),
    speedKmPerS: analysis.speedKmPerS,
    earthArrivalJdTdb:
      analysis.earthArrival === null ? null : jdTdbFromIso(analysis.earthArrival.predictedTime),
  };
}

function measure(cme: Cme): CrossCheckRow {
  const timing = timingOf(cme);
  return { activityId: cme.activityId, timing, motion: cmeFrontMotion(timing, earthDistanceAt) };
}

function measuredSpeedAuPerDay(timing: CmeTiming): number {
  return (timing.speedKmPerS * SECONDS_PER_DAY) / KM_PER_AU;
}

/**
 * Exact equality for every check: the 2026-10-01 recording measured 0 for all three (77 CMEs, 13 with an ENLIL
 * Earth arrival), as they hold by construction (Task 3 decision 4). Approved 2026-10-02.
 */
describe('CME front vs DONKI', () => {
  const rows = toCmes(donkiCmeResponseSchema.parse(RECORDED_DONKI_CME_WINDOW)).map(measure);
  const enlilRows = rows.filter((row) => row.timing.earthArrivalJdTdb !== null);
  const measuredSpeedRows = rows.filter((row) => row.timing.earthArrivalJdTdb === null);

  it('covers CMEs with and without an ENLIL Earth arrival', () => {
    expect(enlilRows.length).toBeGreaterThan(0);
    expect(measuredSpeedRows.length).toBeGreaterThan(0);
  });

  it.each(rows)('$activityId: the front is at 21.5 R☉ at time21_5', (row) => {
    expect(cmeFrontDistanceAu(row.motion, row.timing.time21_5JdTdb)).toBe(
      DONKI_MEASUREMENT_DISTANCE_AU,
    );
  });

  it.each(enlilRows)("$activityId: the front is at Earth's distance at ENLIL's arrival", (row) => {
    const arrivalJdTdb = row.timing.earthArrivalJdTdb ?? Number.NaN;
    expect(cmeFrontDistanceAu(row.motion, arrivalJdTdb)).toBe(earthDistanceAt(arrivalJdTdb));
  });

  it.each(measuredSpeedRows)('$activityId: the front moves at the DONKI speed', (row) => {
    expect(row.motion.speedAuPerDay).toBe(measuredSpeedAuPerDay(row.timing));
  });
});
