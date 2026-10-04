import { RATE_LIMITS_DAYS_PER_SECOND } from '../../time/timeController';
import { easeInOutCubic } from '../camera/flight';

/** Long enough to take in the reveal, short enough that nobody reaches for the skip. */
export const OPENING_SECONDS = 12;
/** Frames the inner system out past Mars (aphelion 1.67 AU) with room for the Amors beyond it. */
export const OPENING_OVERVIEW_DISTANCE_AU = 4;
/** The opening starts at real time, the slowest rate the clock allows. */
export const OPENING_START_RATE_DAYS_PER_SECOND = RATE_LIMITS_DAYS_PER_SECOND.min;
/** Ten days per second: fast enough that the swarm visibly streams, slow enough to follow. */
export const OPENING_FINAL_RATE_DAYS_PER_SECOND = 10;

/**
 * Real time to ten days per second spans 5.9 decades. Interpolating the logarithm spends equal time per decade, as
 * the camera's distance does; a linear ramp would leave real time almost at once. Eased like the flight, so both
 * start and settle together.
 */
export function openingRateDaysPerSecond(elapsedSeconds: number): number {
  if (elapsedSeconds >= OPENING_SECONDS) return OPENING_FINAL_RATE_DAYS_PER_SECOND;
  const progress = easeInOutCubic(Math.max(elapsedSeconds, 0) / OPENING_SECONDS);
  const startLog = Math.log(OPENING_START_RATE_DAYS_PER_SECOND);
  const finalLog = Math.log(OPENING_FINAL_RATE_DAYS_PER_SECOND);
  return Math.exp(startLog + (finalLog - startLog) * progress);
}
