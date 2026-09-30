import { describe, expect, it } from 'vitest';
import { hitchTimesMs, medianMs, summarizeFrameTimes } from './frameTimes';

describe('summarizeFrameTimes', () => {
  it('gives the median, the worst frame and the count over 20 ms', () => {
    expect(summarizeFrameTimes([13.3, 25, 13.4, 13.2, 21])).toEqual({
      frames: 5,
      medianMs: 13.4,
      worstMs: 25,
      hitches: 2,
    });
  });

  it('does not count a frame of exactly 20 ms as a hitch', () => {
    expect(summarizeFrameTimes([20, 20]).hitches).toBe(0);
  });

  it('reports zeros for no frames', () => {
    expect(summarizeFrameTimes([])).toEqual({ frames: 0, medianMs: 0, worstMs: 0, hitches: 0 });
  });
});

describe('hitchTimesMs', () => {
  it('gives the time from the start at which each hitch ended', () => {
    expect(hitchTimesMs([10, 25, 10, 21.4])).toEqual([35, 66]);
  });

  it('is empty without hitches', () => {
    expect(hitchTimesMs([13.3, 13.4, 20])).toEqual([]);
  });
});

describe('medianMs', () => {
  it('averages the middle two of an even count', () => {
    expect(medianMs([4, 1, 3, 2])).toBe(2.5);
  });
});
