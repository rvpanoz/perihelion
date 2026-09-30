import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Vector3 } from '@perihelion/orbit';
import { CAMERA_SETTINGS } from '../canvasConfig';
import {
  type Flight,
  easeInOutCubic,
  flightProgress,
  originProgress,
  writeFlightPose,
} from './flight';

const FLIGHT: Flight = {
  from: { originAu: [0, 0, 0], distanceAu: 3 },
  to: 'earthMoonBarycenter',
  toDistanceAu: 3e-4,
  startSeconds: 10,
  durationSeconds: 2,
};
const EARTH_AU: [number, number, number] = [0.98, 0.17, 0];

function poseAt(progress: number) {
  return writeFlightPose(
    { flight: FLIGHT, targetAu: EARTH_AU, progress },
    {
      originAu: [0, 0, 0],
      distanceAu: 0,
    },
  );
}

describe('easeInOutCubic', () => {
  it('starts at 0, ends at 1 and is symmetric about the middle', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it('never moves backwards', () => {
    const pair = fc.tuple(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
    );
    fc.assert(
      fc.property(pair, ([first, second]) => {
        const [low, high] = first <= second ? [first, second] : [second, first];
        expect(easeInOutCubic(low)).toBeLessThanOrEqual(easeInOutCubic(high));
      }),
    );
  });
});

describe('flightProgress', () => {
  it('clamps to 0 before the start and 1 after the end', () => {
    expect(flightProgress(FLIGHT, 0)).toBe(0);
    expect(flightProgress(FLIGHT, 11)).toBe(0.5);
    expect(flightProgress(FLIGHT, 99)).toBe(1);
  });

  it('treats a zero-length flight as already arrived', () => {
    expect(flightProgress({ ...FLIGHT, durationSeconds: 0 }, 10)).toBe(1);
  });
});

describe('writeFlightPose', () => {
  it('starts at the starting pose and ends on the target', () => {
    // Distances pass through exp(log(x)), which can be one ulp off, so compare them approximately.
    expect(poseAt(0).originAu).toEqual(FLIGHT.from.originAu);
    expect(poseAt(0).distanceAu).toBeCloseTo(FLIGHT.from.distanceAu, 12);
    expect(poseAt(1).originAu).toEqual(EARTH_AU);
    expect(poseAt(1).distanceAu).toBeCloseTo(FLIGHT.toDistanceAu, 15);
  });

  it('eases distance in log space: halfway is the geometric mean', () => {
    expect(poseAt(0.5).distanceAu).toBeCloseTo(Math.sqrt(3 * 3e-4), 12);
  });
});

describe('originProgress', () => {
  it('is exactly 0 at the start and 1 at the end', () => {
    for (const distanceRatio of [1e-4, 0.53, 2, 1e4]) {
      expect(originProgress(0, distanceRatio)).toBe(0);
      expect(originProgress(1, distanceRatio)).toBe(1);
    }
  });

  it('follows the eased progress when the distance does not change', () => {
    expect(originProgress(0.3, 1)).toBe(0.3);
  });

  it('never moves backwards', () => {
    const ratioAndPair = fc.tuple(
      fc.double({ min: 1e-6, max: 1e6, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
    );
    fc.assert(
      fc.property(ratioAndPair, ([distanceRatio, first, second]) => {
        const [low, high] = first <= second ? [first, second] : [second, first];
        const slack = 1e-12;
        expect(originProgress(low, distanceRatio)).toBeLessThanOrEqual(
          originProgress(high, distanceRatio) + slack,
        );
      }),
    );
  });
});

describe('writeFlightPose keeps its subject in view', () => {
  // The vertical field of view is the narrower one, so staying inside it keeps a point on screen.
  const TAN_HALF_FOV = Math.tan(((CAMERA_SETTINGS.fov / 2) * Math.PI) / 180);

  /** Any flight whose travel is shorter than its zoom span times tan(½ fov); the rest are out of scope. */
  const flightCase = fc.record({
    nearAu: fc.double({ min: 1e-5, max: 1, noNaN: true }),
    zoomFactor: fc.double({ min: 2, max: 1e5, noNaN: true }),
    travelFraction: fc.double({ min: 0, max: 0.99, noNaN: true }),
    progress: fc.double({ min: 0, max: 1, noNaN: true }),
  });

  function flyAlongX(
    fromDistanceAu: number,
    toDistanceAu: number,
    travelAu: number,
    progress: number,
  ) {
    const flight: Flight = {
      ...FLIGHT,
      from: { originAu: [0, 0, 0], distanceAu: fromDistanceAu },
      toDistanceAu,
    };
    const targetAu: Vector3 = [travelAu, 0, 0];
    return writeFlightPose({ flight, targetAu, progress }, { originAu: [0, 0, 0], distanceAu: 0 });
  }

  it('keeps the departure point in view on a pull-back', () => {
    fc.assert(
      fc.property(flightCase, ({ nearAu, zoomFactor, travelFraction, progress }) => {
        const farAu = nearAu * zoomFactor;
        const travelAu = travelFraction * (farAu - nearAu) * TAN_HALF_FOV;
        const pose = flyAlongX(nearAu, farAu, travelAu, progress);
        expect(Math.abs(pose.originAu[0])).toBeLessThanOrEqual(pose.distanceAu * TAN_HALF_FOV);
      }),
    );
  });

  it('keeps the target in view on a zoom-in', () => {
    fc.assert(
      fc.property(flightCase, ({ nearAu, zoomFactor, travelFraction, progress }) => {
        const farAu = nearAu * zoomFactor;
        const travelAu = travelFraction * (farAu - nearAu) * TAN_HALF_FOV;
        const pose = flyAlongX(farAu, nearAu, travelAu, progress);
        expect(Math.abs(travelAu - pose.originAu[0])).toBeLessThanOrEqual(
          pose.distanceAu * TAN_HALF_FOV,
        );
      }),
    );
  });
});
