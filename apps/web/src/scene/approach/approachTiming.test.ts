import { describe, expect, it } from 'vitest';
import { crossingDays } from './approachTiming';

describe('crossingDays', () => {
  it('is the time to cover the miss distance at the relative speed', () => {
    // 0.01 AU = 1,495,978.707 km; at 10 km/s that is 149,597.87 s = 1.731457 d.
    expect(crossingDays({ distanceAu: 0.01, relativeVelocityKmPerS: 10 })).toBeCloseTo(1.731457, 6);
  });

  it('guards a zero speed and caps very slow passes at 10 days', () => {
    expect(crossingDays({ distanceAu: 1e-4, relativeVelocityKmPerS: 0 })).toBeCloseTo(
      (1e-4 * 149_597_870.7) / 0.1 / 86_400,
      9,
    );
    expect(crossingDays({ distanceAu: 0.05, relativeVelocityKmPerS: 0.5 })).toBe(10);
  });
});
