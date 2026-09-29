import { calendarFromJulianDate, jdTdbFromJdUtc, jdUtcFromJdTdb } from '@perihelion/orbit';
import { RATE_LIMITS_DAYS_PER_SECOND } from './timeController';

/** 1972-01-01 00:00 UTC: UTC has no leap-second definition before it, so earlier dates are shown in TDB. */
const UTC_LEAP_SECONDS_START_JD_UTC = 2_441_317.5;
const UTC_START_JD_TDB = jdTdbFromJdUtc(UTC_LEAP_SECONDS_START_JD_UTC);

export function formatSimulationDate(jdTdb: number): string {
  if (jdTdb < UTC_START_JD_TDB) return `${formatCalendar(jdTdb)} TDB`;
  return `${formatCalendar(jdUtcFromJdTdb(jdTdb))} UTC`;
}

function formatCalendar(julianDate: number): string {
  const { year, month, day, hour, minute } = calendarFromJulianDate(julianDate);
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

const LOG_RATE_MIN = Math.log(RATE_LIMITS_DAYS_PER_SECOND.min);
const LOG_RATE_SPAN = Math.log(RATE_LIMITS_DAYS_PER_SECOND.max) - LOG_RATE_MIN;

/** Log scale: the 8 decades from real time to 10 yr/s each get the same slider travel. */
export function rateFromSliderPosition(position: number): number {
  return Math.exp(LOG_RATE_MIN + position * LOG_RATE_SPAN);
}

export function sliderPositionFromRate(rateDaysPerSecond: number): number {
  return (Math.log(rateDaysPerSecond) - LOG_RATE_MIN) / LOG_RATE_SPAN;
}

const RATE_UNITS = [
  { label: 'yr', days: 365.25 },
  { label: 'd', days: 1 },
  { label: 'h', days: 1 / 24 },
  { label: 'min', days: 1 / 1_440 },
  { label: 's', days: 1 / 86_400 },
] as const;

/** Slider rates come back through exp(log(x)), so "real time" allows a few ulps of drift. */
const REAL_TIME_TOLERANCE = 1 + 1e-9;

export function formatRate(rateDaysPerSecond: number): string {
  if (rateDaysPerSecond <= RATE_LIMITS_DAYS_PER_SECOND.min * REAL_TIME_TOLERANCE)
    return 'real time';
  const unit = RATE_UNITS.find((candidate) => rateDaysPerSecond >= candidate.days) ?? RATE_UNITS[4];
  const value = rateDaysPerSecond / unit.days;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit.label}/s`;
}
