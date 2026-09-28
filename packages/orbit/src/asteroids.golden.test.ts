import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_NAMES,
  ASTEROID_OFFSET_DAYS,
  ASTEROID_SAMPLE_JD_TDB,
  type AsteroidFixture,
  type AsteroidName,
  type ElementsRecord,
  type StateRecord,
  loadAsteroidFixtures,
} from '@perihelion/fixtures/golden';
import { describe, expect, it } from 'vitest';
import { GM_SUN_AU3_PER_DAY2, type OrbitalElements, stateFromElements } from './elements';
import { stateAtTime } from './propagate';
import { type Vector3 } from './vector3';

const RAD_PER_DEG = Math.PI / 180;

/**
 * Worst position error (AU) over ±120 days against Horizons, measured on 2026-09-28. It grows with
 * the square of the time from the epoch: planetary perturbations the two-body model leaves out.
 * See "Calibrated tolerances" in PROGRESS.md.
 */
const MEASURED_MAX_ERROR_AU: Readonly<Record<AsteroidName, number>> = {
  eros: 5.65e-5,
  apophis: 1.95e-5,
  bennu: 3.45e-5,
  ryugu: 2.36e-5,
  phaethon: 4.92e-5,
  aten: 1.72e-5,
  atira: 3.34e-5,
};

/** Room for harmless numeric changes (solver iterations, operation order); real bugs move far more. */
const TOLERANCE_MARGIN = 1.25;

/** The Phase 1 target in PLAN.md: two-body position within 1e-3 AU inside ±60 days of the epoch. */
const PLAN_TARGET_AU = 1e-3;
const PLAN_TARGET_WINDOW_DAYS = 60;
const FULL_WINDOW_DAYS = Math.max(...ASTEROID_OFFSET_DAYS);

/**
 * At the epoch nothing is propagated, so only the element conversion is tested (measured ≤ 3e-15 AU
 * and 6e-14 AU/day). A fixed 15 cm bound, since a multiple of float noise would be brittle.
 */
const EPOCH_POSITION_TOLERANCE_AU = 1e-12;
const EPOCH_VELOCITY_TOLERANCE_AU_PER_DAY = 1e-12;

/** Horizons' Keplerian GM matches k² to 5e-12; a different GM would show up as drift in time. */
const GM_RELATIVE_TOLERANCE = 1e-11;

function toOrbitalElements(record: ElementsRecord): OrbitalElements {
  return {
    semiMajorAxisAu: record.semiMajorAxisAu,
    eccentricity: record.eccentricity,
    inclinationRad: record.inclinationDeg * RAD_PER_DEG,
    longitudeOfAscendingNodeRad: record.longitudeOfAscendingNodeDeg * RAD_PER_DEG,
    argumentOfPerihelionRad: record.argumentOfPerihelionDeg * RAD_PER_DEG,
    meanAnomalyRad: record.meanAnomalyDeg * RAD_PER_DEG,
    epochJdTdb: record.epochJdTdb,
  };
}

function distance(first: Readonly<Vector3>, second: Readonly<Vector3>): number {
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function worstPositionErrorAu(asteroid: AsteroidFixture, windowDays: number): number {
  const elements = toOrbitalElements(asteroid.elements);
  return asteroid.states
    .filter(({ jdTdb }) => Math.abs(jdTdb - ASTEROID_EPOCH_JD_TDB) <= windowDays)
    .map(({ jdTdb, positionAu }) => distance(stateAtTime(elements, jdTdb).positionAu, positionAu))
    .reduce((worstAu, errorAu) => Math.max(worstAu, errorAu), 0);
}

function stateAtEpoch(asteroid: AsteroidFixture): StateRecord {
  const state = asteroid.states.find(({ jdTdb }) => jdTdb === ASTEROID_EPOCH_JD_TDB);
  if (state === undefined) throw new Error('Fixture has no state at the element epoch');
  return state;
}

const { asteroids } = loadAsteroidFixtures();

describe('two-body asteroid positions against Horizons', () => {
  it('has a fixture state for every sample date', () => {
    for (const name of ASTEROID_NAMES) {
      expect(asteroids[name].states.map(({ jdTdb }) => jdTdb)).toEqual(ASTEROID_SAMPLE_JD_TDB);
    }
  });

  it.each(ASTEROID_NAMES)('uses the GM Horizons derived the %s elements with', (name) => {
    const gmRatio = asteroids[name].provenance.keplerianGmAu3PerDay2 / GM_SUN_AU3_PER_DAY2;
    expect(Math.abs(gmRatio - 1)).toBeLessThanOrEqual(GM_RELATIVE_TOLERANCE);
  });

  it.each(ASTEROID_NAMES)('turns the %s elements into the Horizons state at the epoch', (name) => {
    const expected = stateAtEpoch(asteroids[name]);
    const state = stateFromElements(toOrbitalElements(asteroids[name].elements));
    expect(distance(state.positionAu, expected.positionAu)).toBeLessThanOrEqual(
      EPOCH_POSITION_TOLERANCE_AU,
    );
    expect(distance(state.velocityAuPerDay, expected.velocityAuPerDay)).toBeLessThanOrEqual(
      EPOCH_VELOCITY_TOLERANCE_AU_PER_DAY,
    );
  });

  it.each(ASTEROID_NAMES)('keeps %s within the PLAN target inside ±60 days', (name) => {
    expect(worstPositionErrorAu(asteroids[name], PLAN_TARGET_WINDOW_DAYS)).toBeLessThanOrEqual(
      PLAN_TARGET_AU,
    );
  });

  it.each(ASTEROID_NAMES)('keeps %s within its calibrated tolerance over ±120 days', (name) => {
    const toleranceAu = MEASURED_MAX_ERROR_AU[name] * TOLERANCE_MARGIN;
    expect(worstPositionErrorAu(asteroids[name], FULL_WINDOW_DAYS)).toBeLessThanOrEqual(
      toleranceAu,
    );
  });
});
