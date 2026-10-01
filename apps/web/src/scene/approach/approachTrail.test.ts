import { planetElementsAt, writeGeocentricOffset } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { TRAIL_POINTS, trailIndexAt, trailOffsetDays, writeTrail } from './approachTrail';

const HALF_WINDOW_DAYS = 5;

describe('trailOffsetDays', () => {
  it('spans the window, symmetric and increasing', () => {
    expect(trailOffsetDays(0, HALF_WINDOW_DAYS)).toBe(-HALF_WINDOW_DAYS);
    expect(trailOffsetDays(TRAIL_POINTS - 1, HALF_WINDOW_DAYS)).toBe(HALF_WINDOW_DAYS);
    for (let index = 1; index < TRAIL_POINTS; index += 1) {
      const offset = trailOffsetDays(index, HALF_WINDOW_DAYS);
      expect(offset).toBeGreaterThan(trailOffsetDays(index - 1, HALF_WINDOW_DAYS));
      expect(offset).toBeCloseTo(-trailOffsetDays(TRAIL_POINTS - 1 - index, HALF_WINDOW_DAYS), 12);
    }
  });

  it('is densest at closest approach', () => {
    const middle = TRAIL_POINTS / 2;
    const centreStep = trailOffsetDays(middle, 1) - trailOffsetDays(middle - 1, 1);
    const edgeStep = trailOffsetDays(TRAIL_POINTS - 1, 1) - trailOffsetDays(TRAIL_POINTS - 2, 1);
    expect(centreStep).toBeLessThan(edgeStep / 1000);
  });
});

describe('trailIndexAt', () => {
  it('inverts trailOffsetDays and clamps outside the window', () => {
    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      expect(trailIndexAt(trailOffsetDays(index, HALF_WINDOW_DAYS), HALF_WINDOW_DAYS)).toBe(index);
    }
    expect(trailIndexAt(-99, HALF_WINDOW_DAYS)).toBe(0);
    expect(trailIndexAt(99, HALF_WINDOW_DAYS)).toBe(TRAIL_POINTS - 1);
  });
});

describe('writeTrail', () => {
  it('writes each sample as the geocentric offset at its time, in scene axes', () => {
    const elements = { ...planetElementsAt('mars', 2_461_000.5) };
    const request = { elements, approachJdTdb: 2_461_000.5, halfWindowDays: HALF_WINDOW_DAYS };
    const trail = writeTrail(request, new Float32Array(TRAIL_POINTS * 3));
    for (const index of [0, 100, TRAIL_POINTS - 1]) {
      const jdTdb = request.approachJdTdb + trailOffsetDays(index, HALF_WINDOW_DAYS);
      const [x, y, z] = writeGeocentricOffset({ elements, jdTdb }, [0, 0, 0]);
      // Scene axes are ecliptic (x, z, −y); float32 keeps ~7 significant figures.
      expect(trail[index * 3]).toBeCloseTo(x, 6);
      expect(trail[index * 3 + 1]).toBeCloseTo(z, 6);
      expect(trail[index * 3 + 2]).toBeCloseTo(-y, 6);
    }
  });
});
