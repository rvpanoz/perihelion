import { STANDISH_TABLE_1_VALID_JD_TDB, jdTdbFromJdUtc, jdUtcFromUnixMs } from '@perihelion/orbit';

const SECONDS_PER_DAY = 86_400;
const DAYS_PER_JULIAN_YEAR = 365.25;

interface Bounds {
  min: number;
  max: number;
}

/** Planet positions come from Standish Table 1, fitted to 1800–2050; outside it they are extrapolations. */
export const TIME_RANGE_JD_TDB = STANDISH_TABLE_1_VALID_JD_TDB;

export const RATE_LIMITS_DAYS_PER_SECOND = {
  min: 1 / SECONDS_PER_DAY,
  max: 10 * DAYS_PER_JULIAN_YEAR,
} as const satisfies Bounds;

export const DEFAULT_RATE_DAYS_PER_SECOND = 1;

/**
 * Longest frame counted as elapsed time. R3F reports the whole gap after a backgrounded tab or a debugger
 * pause as one frame; counting it would jump the simulation by up to years.
 */
export const MAX_FRAME_SECONDS = 0.1;

const JD_TDB_BOUNDS: Bounds = {
  min: TIME_RANGE_JD_TDB.startJdTdb,
  max: TIME_RANGE_JD_TDB.endJdTdb,
};
const FRAME_SECONDS_BOUNDS: Bounds = { min: 0, max: MAX_FRAME_SECONDS };

export interface TimeState {
  jdTdb: number;
  rateDaysPerSecond: number;
  playing: boolean;
}

export function jdTdbFromUnixMs(unixMs: number): number {
  return jdTdbFromJdUtc(jdUtcFromUnixMs(unixMs));
}

export function clampJdTdb(jdTdb: number): number {
  return clamp(jdTdb, JD_TDB_BOUNDS);
}

export function clampRate(rateDaysPerSecond: number): number {
  return clamp(rateDaysPerSecond, RATE_LIMITS_DAYS_PER_SECOND);
}

/** Runs every frame, so it mutates in place instead of allocating. Pauses at the end of the range. */
export function advanceTime(state: TimeState, elapsedSeconds: number): void {
  if (!state.playing) return;
  const frameSeconds = Number.isFinite(elapsedSeconds)
    ? clamp(elapsedSeconds, FRAME_SECONDS_BOUNDS)
    : 0;
  state.jdTdb = clampJdTdb(state.jdTdb + frameSeconds * state.rateDaysPerSecond);
  if (state.jdTdb === TIME_RANGE_JD_TDB.endJdTdb) state.playing = false;
}

function clamp(value: number, bounds: Readonly<Bounds>): number {
  return Math.min(Math.max(value, bounds.min), bounds.max);
}
