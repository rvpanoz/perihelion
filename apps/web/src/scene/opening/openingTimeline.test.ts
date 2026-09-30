import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  OPENING_FINAL_RATE_DAYS_PER_SECOND,
  OPENING_SECONDS,
  OPENING_START_RATE_DAYS_PER_SECOND,
  openingRateDaysPerSecond,
} from './openingTimeline';

describe('openingRateDaysPerSecond', () => {
  it('starts at real time', () => {
    expect(openingRateDaysPerSecond(0)).toBeCloseTo(OPENING_START_RATE_DAYS_PER_SECOND, 12);
    expect(OPENING_START_RATE_DAYS_PER_SECOND).toBe(1 / 86_400);
  });

  it('holds the final rate from the end of the move on', () => {
    for (const elapsedSeconds of [OPENING_SECONDS, OPENING_SECONDS + 1, 1e6]) {
      expect(openingRateDaysPerSecond(elapsedSeconds)).toBe(OPENING_FINAL_RATE_DAYS_PER_SECOND);
    }
  });

  it('is the geometric mean of the two ends halfway through', () => {
    const geometricMean = Math.sqrt(
      OPENING_START_RATE_DAYS_PER_SECOND * OPENING_FINAL_RATE_DAYS_PER_SECOND,
    );
    expect(openingRateDaysPerSecond(OPENING_SECONDS / 2) / geometricMean).toBeCloseTo(1, 12);
  });

  it('never slows down', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1, max: OPENING_SECONDS + 1, noNaN: true }),
        fc.double({ min: 0, max: OPENING_SECONDS + 1, noNaN: true }),
        (earlierSeconds, gapSeconds) => {
          const earlier = openingRateDaysPerSecond(earlierSeconds);
          expect(openingRateDaysPerSecond(earlierSeconds + gapSeconds)).toBeGreaterThanOrEqual(
            earlier,
          );
        },
      ),
    );
  });
});
