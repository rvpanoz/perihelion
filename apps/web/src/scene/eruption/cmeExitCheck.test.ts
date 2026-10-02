import { type Cme, donkiCmeResponseSchema, toCmes } from '@perihelion/data';
import { RECORDED_DONKI_CME_WINDOW } from '@perihelion/fixtures/upstream';
import {
  DONKI_MEASUREMENT_DISTANCE_AU,
  type Vector3,
  angleFromEarthRad,
  cross,
  dot,
  earthHeliographicLatitudeRad,
  norm,
} from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { cmeCard } from '../../eruptions/cmeCardModel';
import { cmeCone, earthPositionAtMeasurementAu, jdTdbFromIso } from '../../eruptions/cmeGeometry';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { coneBasis, shellParticleOffsetAu } from './cmeShellGeometry';
import { CME_SHELL_LOOK } from './cmeShellLook';
import { createShellSeeds, mulberry32, shellSeedAt } from './cmeShellSeeds';
import { cmeAxisEcliptic, cmeShellMotion, cmeShellState, earthDistanceAu } from './cmeShellTiming';
import { eruptionShot } from './eruptionShot';

/**
 * Phase 6 exit check: every CME in the 2026-10-01 recording, drawn the way the app draws it, against its DONKI
 * analysis (direction, cone width, timing). Tolerances are measured × 1.25, exact where the measurement was 0
 * (PROGRESS "Calibrated tolerances", 2026-10-02):
 * - direction: worst 4.4e-16 rad (float64 rounding of the same rotation);
 * - cone width: no particle outside the half-angle (worst 1.4e-6 rad inside), the widest at ≥ 0.9999916 of it;
 * - timing: 0 at time21_5 and at ENLIL's arrival.
 */
const MAX_DIRECTION_ERROR_RAD = 5.6e-16;
const MIN_CONE_FILL = 1 - (1 - 0.999_991_6) * 1.25;
/** The shell's shape scales with the front, so one distance tests it. */
const TEST_FRONT_AU = 0.5;

const cmes = toCmes(donkiCmeResponseSchema.parse(RECORDED_DONKI_CME_WINDOW));
const seeds = createShellSeeds(CME_SHELL_LOOK.particleCount, mulberry32(20_261_002));
const particleCount = CME_SHELL_LOOK.particleCount;

function angleRad(first: Readonly<Vector3>, second: Readonly<Vector3>): number {
  return Math.atan2(norm(cross(first, second)), dot(first, second));
}

/** The widest particle's angle from the axis, for the shell the app would draw for this CME. */
function widestParticleRad(cme: Cme): number {
  const axisScene = sceneAxesFromEcliptic(cmeAxisEcliptic(cme));
  const shape = {
    basis: coneBasis(axisScene),
    cosHalfAngle: Math.cos(cmeCone(cme.analysis).halfAngleRad),
    frontDistanceAu: TEST_FRONT_AU,
  };
  let widest = 0;
  for (let index = 0; index < particleCount; index += 1) {
    const offset = shellParticleOffsetAu(shellSeedAt(seeds, index), shape, [0, 0, 0]);
    widest = Math.max(widest, angleRad(offset, axisScene));
  }
  return widest;
}

describe('Phase 6 exit: the drawn CME vs its DONKI analysis', () => {
  it('covers every recorded CME, with and without an ENLIL arrival', () => {
    expect(cmes).toHaveLength(77);
    expect(cmes.filter((cme) => cme.analysis.earthArrival !== null)).toHaveLength(13);
  });

  it.each(cmes)("$activityId: direction is DONKI's angle from Earth", (cme) => {
    const earth = earthPositionAtMeasurementAu(cme.analysis);
    const donkiRad = angleFromEarthRad(
      cmeCone(cme.analysis).axis,
      earthHeliographicLatitudeRad(earth),
    );
    expect(Math.abs(angleRad(cmeAxisEcliptic(cme), earth) - donkiRad)).toBeLessThanOrEqual(
      MAX_DIRECTION_ERROR_RAD,
    );
  });

  it.each(cmes)("$activityId: the shell fills DONKI's cone and never leaves it", (cme) => {
    const halfAngleRad = cmeCone(cme.analysis).halfAngleRad;
    const widestRad = widestParticleRad(cme);
    expect(widestRad).toBeLessThanOrEqual(halfAngleRad);
    expect(widestRad / halfAngleRad).toBeGreaterThanOrEqual(MIN_CONE_FILL);
  });

  it.each(cmes)("$activityId: the front meets DONKI's and ENLIL's times", (cme) => {
    const motion = cmeShellMotion(cme);
    const time21_5 = jdTdbFromIso(cme.analysis.time21_5);
    expect(cmeShellState(motion, time21_5).frontDistanceAu).toBe(DONKI_MEASUREMENT_DISTANCE_AU);
    const arrival = cme.analysis.earthArrival;
    if (arrival === null) return;
    const arrivalJdTdb = jdTdbFromIso(arrival.predictedTime);
    expect(cmeShellState(motion, arrivalJdTdb).frontDistanceAu).toBe(earthDistanceAu(arrivalJdTdb));
  });

  it.each(cmes)(
    "$activityId: the card shows DONKI's figures and the shot plays ENLIL's arrival",
    (cme) => {
      const { analysis } = cme;
      const [speed, halfAngle] = cmeCard(cme).stats;
      expect(speed?.value).toBe(`${analysis.speedKmPerS} km/s`);
      expect(halfAngle?.value).toBe(`${analysis.halfAngleDeg}°`);
      const impact = eruptionShot(cme).beats.find((beat) => beat.name === 'impact');
      if (analysis.earthArrival === null) {
        expect(impact).toBeUndefined();
        return;
      }
      const arrivalJdTdb = jdTdbFromIso(analysis.earthArrival.predictedTime);
      expect(impact?.startJdTdb).toBeLessThan(arrivalJdTdb);
      expect(impact?.endJdTdb).toBeGreaterThan(arrivalJdTdb);
    },
  );
});
