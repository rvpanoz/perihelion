import { KM_PER_AU } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { TRAIL_POINTS, trailForApproach, trailOffsetDays } from '../scene/approach/approachTrail';
import { closeApproachRow } from '../test/closeApproachRow';
import { KM_PER_LUNAR_DISTANCE } from './approachFormat';
import {
  LUNAR_DISTANCE_AU,
  closeUpGeometry,
  closeUpHalfSpanAu,
  closeUpMarkerIndex,
  closeUpPath,
  closeUpPixelPoints,
  closeUpPixelsPerAu,
} from './closeUpModel';

const HALF_WINDOW_DAYS = 5;
const MISS_AU = 0.01;
const SPEED_AU_PER_DAY = 0.002;

/** (d, 0, 0) + t · (0, v, 0) at the trail's sample times; −1 mirrors the whole pass through Earth. */
function straightTrail(sign: 1 | -1): Float32Array {
  const trail = new Float32Array(TRAIL_POINTS * 3);
  for (let index = 0; index < TRAIL_POINTS; index += 1) {
    const offsetDays = trailOffsetDays(index, HALF_WINDOW_DAYS);
    trail.set([sign * MISS_AU, sign * offsetDays * SPEED_AU_PER_DAY, 0], index * 3);
  }
  return trail;
}

describe('closeUpPath', () => {
  it('marks the sample nearest closest approach', () => {
    const { closestIndex } = closeUpPath(straightTrail(1));
    const offsets = Array.from({ length: TRAIL_POINTS }, (_, index) =>
      Math.abs(trailOffsetDays(index, HALF_WINDOW_DAYS)),
    );
    expect(Math.abs(trailOffsetDays(closestIndex, HALF_WINDOW_DAYS))).toBeCloseTo(
      Math.min(...offsets),
      15,
    );
  });

  it('puts the closest point at (0, d) and keeps a straight pass straight', () => {
    const { points, closestIndex } = closeUpPath(straightTrail(1));
    expect(points[closestIndex * 2]).toBeCloseTo(0, 8);
    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      expect(points[index * 2 + 1]).toBeCloseTo(MISS_AU, 8);
    }
  });

  it('runs the motion left to right', () => {
    const { points } = closeUpPath(straightTrail(1));
    for (let index = 1; index < TRAIL_POINTS; index += 1) {
      expect(points[index * 2]).toBeGreaterThan(points[(index - 1) * 2] ?? Infinity);
    }
  });

  it('builds the frame from the trail, so a pass mirrored through Earth projects the same', () => {
    const { points } = closeUpPath(straightTrail(1));
    const mirrored = closeUpPath(straightTrail(-1)).points;
    for (let index = 0; index < points.length; index += 1) {
      expect(mirrored[index]).toBeCloseTo(points[index] ?? NaN, 12);
    }
  });
});

describe('closeUpHalfSpanAu', () => {
  it('shows four miss distances either side of Earth', () => {
    expect(closeUpHalfSpanAu(0.0123456789)).toBeCloseTo(4 * 0.0123456789, 15);
  });

  it('never shrinks below 1.25 LD, so the 1 LD ring stays in view', () => {
    expect(closeUpHalfSpanAu(1e-4)).toBeCloseTo((1.25 * KM_PER_LUNAR_DISTANCE) / KM_PER_AU, 15);
  });
});

describe('closeUpPixelPoints', () => {
  it('fits the half-span to the half-height', () => {
    expect(closeUpPixelsPerAu(0.02)).toBeCloseTo(86 / 0.02, 9);
  });

  it('puts Earth at the centre with y up', () => {
    const pixels = closeUpPixelPoints(
      new Float64Array([0, 0, 0.02, 0.02, -0.01, -0.02]),
      86 / 0.02,
    );
    expect(Array.from(pixels, (value) => Number(value.toFixed(9)))).toEqual([
      147, 86, 233, 0, 104, 172,
    ]);
  });
});

describe('closeUpMarkerIndex', () => {
  it('is the trail sample nearest now inside the window', () => {
    expect(closeUpMarkerIndex(trailOffsetDays(100, HALF_WINDOW_DAYS), HALF_WINDOW_DAYS)).toBe(100);
    expect(closeUpMarkerIndex(HALF_WINDOW_DAYS, HALF_WINDOW_DAYS)).toBe(TRAIL_POINTS - 1);
    expect(closeUpMarkerIndex(-HALF_WINDOW_DAYS, HALF_WINDOW_DAYS)).toBe(0);
  });

  it('hides the marker outside the window rather than pinning it to an end', () => {
    expect(closeUpMarkerIndex(HALF_WINDOW_DAYS * 1.01, HALF_WINDOW_DAYS)).toBeUndefined();
    expect(closeUpMarkerIndex(-HALF_WINDOW_DAYS * 1.01, HALF_WINDOW_DAYS)).toBeUndefined();
  });
});

describe('closeUpGeometry', () => {
  it('lays out the selected trail at the close-up scale', () => {
    const approach = closeApproachRow();
    const geometry = closeUpGeometry(approach);
    const path = closeUpPath(trailForApproach(approach).positions);
    const pixelsPerAu = closeUpPixelsPerAu(closeUpHalfSpanAu(approach.distanceAu));
    const pixels = closeUpPixelPoints(path.points, pixelsPerAu);
    expect(geometry.closestIndex).toBe(path.closestIndex);
    expect(geometry.pixels).toEqual(pixels);
    expect(geometry.ringRadiusPx).toBeCloseTo(LUNAR_DISTANCE_AU * pixelsPerAu, 9);
    expect(geometry.pointTexts).toHaveLength(TRAIL_POINTS);
    expect(geometry.pointTexts[1]).toBe(`${pixels[2]?.toFixed(1)},${pixels[3]?.toFixed(1)}`);
  });
});
