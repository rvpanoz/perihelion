import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  MAX_FRAME_SECONDS,
  RATE_LIMITS_DAYS_PER_SECOND,
  TIME_RANGE_JD_TDB,
  type TimeState,
  advanceTime,
  clampJdTdb,
  clampRate,
} from './timeController';

const J2000_JD_TDB = 2_451_545;

function playingAt(jdTdb: number, rateDaysPerSecond = 1): TimeState {
  return { jdTdb, rateDaysPerSecond, playing: true };
}

describe('advanceTime', () => {
  it('moves by elapsed seconds × rate while playing', () => {
    const state = playingAt(J2000_JD_TDB, 2);
    advanceTime(state, 0.05);
    expect(state.jdTdb).toBeCloseTo(J2000_JD_TDB + 0.1, 12);
  });

  it('does nothing while paused', () => {
    const state = { ...playingAt(J2000_JD_TDB), playing: false };
    advanceTime(state, 0.05);
    expect(state.jdTdb).toBe(J2000_JD_TDB);
  });

  it('caps a long frame, so a tab resumed after minutes does not leap ahead', () => {
    const state = playingAt(J2000_JD_TDB, 1);
    advanceTime(state, 300);
    expect(state.jdTdb).toBeCloseTo(J2000_JD_TDB + MAX_FRAME_SECONDS, 12);
  });

  it('ignores negative and non-finite frame times', () => {
    for (const elapsedSeconds of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const state = playingAt(J2000_JD_TDB);
      advanceTime(state, elapsedSeconds);
      expect(state.jdTdb).toBe(J2000_JD_TDB);
    }
  });

  it('stops and pauses at the end of the valid range', () => {
    const state = playingAt(TIME_RANGE_JD_TDB.endJdTdb - 1, RATE_LIMITS_DAYS_PER_SECOND.max);
    advanceTime(state, MAX_FRAME_SECONDS);
    expect(state).toMatchObject({ jdTdb: TIME_RANGE_JD_TDB.endJdTdb, playing: false });
  });
});

describe('clamps', () => {
  it('keeps any date inside 1800–2050', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (jdTdb) => {
        const clamped = clampJdTdb(jdTdb);
        expect(clamped).toBeGreaterThanOrEqual(TIME_RANGE_JD_TDB.startJdTdb);
        expect(clamped).toBeLessThanOrEqual(TIME_RANGE_JD_TDB.endJdTdb);
      }),
    );
  });

  it('keeps the rate between real time and 10 years per second', () => {
    expect(clampRate(0)).toBe(1 / 86_400);
    expect(clampRate(1e9)).toBe(3_652.5);
    expect(clampRate(1)).toBe(1);
  });
});
