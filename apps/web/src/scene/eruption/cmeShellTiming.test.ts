import {
  DONKI_MEASUREMENT_DISTANCE_AU,
  angleFromEarthRad,
  earthHeliographicLatitudeRad,
  norm,
} from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { cmeCone, earthPositionAtMeasurementAu, jdTdbFromIso } from '../../eruptions/cmeGeometry';
import { cmeRow, cmeRowWithAnalysis } from '../../test/cmeRow';
import {
  cmeAxisEcliptic,
  cmeShellMotion,
  cmeShellState,
  earthDistanceAu,
  smoothstep,
} from './cmeShellTiming';

const cme = cmeRow();
const time21_5JdTdb = jdTdbFromIso(cme.analysis.time21_5);

describe('cmeShellState', () => {
  const motion = cmeShellMotion(cme);

  it('puts the front at 21.5 R☉ at time21_5 and at Earth at the ENLIL arrival', () => {
    expect(cmeShellState(motion, time21_5JdTdb).frontDistanceAu).toBe(
      DONKI_MEASUREMENT_DISTANCE_AU,
    );
    const arrivalJdTdb = jdTdbFromIso(cme.analysis.earthArrival?.predictedTime ?? '');
    expect(cmeShellState(motion, arrivalJdTdb).frontDistanceAu).toBeCloseTo(
      earthDistanceAu(arrivalJdTdb),
      12,
    );
  });

  it('moves at the measured speed without an ENLIL arrival', () => {
    const measured = cmeShellMotion(cmeRowWithAnalysis({ earthArrival: null }));
    expect(measured.speedAuPerDay).toBe((cme.analysis.speedKmPerS * 86_400) / 149_597_870.7);
  });

  it('is hidden before launch, opaque in flight and gone well past Earth', () => {
    expect(cmeShellState(motion, time21_5JdTdb - 1).opacity).toBe(0);
    expect(cmeShellState(motion, time21_5JdTdb + 1).opacity).toBe(1);
    expect(cmeShellState(motion, time21_5JdTdb + 30).opacity).toBe(0);
  });
});

describe('cmeAxisEcliptic', () => {
  it("is a unit vector at DONKI's angle from Earth", () => {
    const axis = cmeAxisEcliptic(cme);
    expect(norm(axis)).toBeCloseTo(1, 14);
    const earth = earthPositionAtMeasurementAu(cme.analysis);
    const cosine = (axis[0] * earth[0] + axis[1] * earth[1] + axis[2] * earth[2]) / norm(earth);
    const expected = angleFromEarthRad(
      cmeCone(cme.analysis).axis,
      earthHeliographicLatitudeRad(earth),
    );
    expect(Math.acos(cosine)).toBeCloseTo(expected, 9);
  });
});

describe('smoothstep', () => {
  it('matches GLSL at and between the edges', () => {
    expect(smoothstep(1, 2, 0)).toBe(0);
    expect(smoothstep(1, 2, 1.5)).toBe(0.5);
    expect(smoothstep(1, 2, 3)).toBe(1);
  });
});
