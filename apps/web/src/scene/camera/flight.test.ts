import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Flight, easeInOutCubic, flightProgress, writeFlightPose } from './flight';

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
