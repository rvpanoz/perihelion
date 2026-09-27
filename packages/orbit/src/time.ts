/**
 * Julian Dates and time scales. The engine works in JD (TDB); UTC only appears at the boundary.
 * Calendar dates are proleptic Gregorian. A float64 JD near 2.45e6 resolves about 40 µs, far
 * finer than anything we test or render.
 */

export interface CalendarDateTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** May be fractional. */
  second: number;
}

const MS_PER_DAY = 86_400_000;
const SECONDS_PER_DAY = 86_400;

/** JD of the Unix epoch, 1970-01-01T00:00:00 UTC. */
const JD_UNIX_EPOCH = 2_440_587.5;

/** TT − TAI, exact by definition (IAU 1991 Resolution A4). */
const TT_MINUS_TAI_SECONDS = 32.184;

/**
 * TAI − UTC from each leap second on, per IERS Bulletin C (mirrored in USNO tai-utc.dat).
 * Latest entry: 2017-01-01. Append a row whenever Bulletin C announces a new leap second.
 */
const LEAP_SECONDS = [
  { year: 1972, month: 1, taiMinusUtcSeconds: 10 },
  { year: 1972, month: 7, taiMinusUtcSeconds: 11 },
  { year: 1973, month: 1, taiMinusUtcSeconds: 12 },
  { year: 1974, month: 1, taiMinusUtcSeconds: 13 },
  { year: 1975, month: 1, taiMinusUtcSeconds: 14 },
  { year: 1976, month: 1, taiMinusUtcSeconds: 15 },
  { year: 1977, month: 1, taiMinusUtcSeconds: 16 },
  { year: 1978, month: 1, taiMinusUtcSeconds: 17 },
  { year: 1979, month: 1, taiMinusUtcSeconds: 18 },
  { year: 1980, month: 1, taiMinusUtcSeconds: 19 },
  { year: 1981, month: 7, taiMinusUtcSeconds: 20 },
  { year: 1982, month: 7, taiMinusUtcSeconds: 21 },
  { year: 1983, month: 7, taiMinusUtcSeconds: 22 },
  { year: 1985, month: 7, taiMinusUtcSeconds: 23 },
  { year: 1988, month: 1, taiMinusUtcSeconds: 24 },
  { year: 1990, month: 1, taiMinusUtcSeconds: 25 },
  { year: 1991, month: 1, taiMinusUtcSeconds: 26 },
  { year: 1992, month: 7, taiMinusUtcSeconds: 27 },
  { year: 1993, month: 7, taiMinusUtcSeconds: 28 },
  { year: 1994, month: 7, taiMinusUtcSeconds: 29 },
  { year: 1996, month: 1, taiMinusUtcSeconds: 30 },
  { year: 1997, month: 7, taiMinusUtcSeconds: 31 },
  { year: 1999, month: 1, taiMinusUtcSeconds: 32 },
  { year: 2006, month: 1, taiMinusUtcSeconds: 33 },
  { year: 2009, month: 1, taiMinusUtcSeconds: 34 },
  { year: 2012, month: 7, taiMinusUtcSeconds: 35 },
  { year: 2015, month: 7, taiMinusUtcSeconds: 36 },
  { year: 2017, month: 1, taiMinusUtcSeconds: 37 },
] as const;

const LEAP_SECOND_STEPS = LEAP_SECONDS.map(({ year, month, taiMinusUtcSeconds }) => ({
  jdUtc: julianDateFromCalendar({ year, month, day: 1, hour: 0, minute: 0, second: 0 }),
  taiMinusUtcSeconds,
}));

/** Meeus, Astronomical Algorithms (2nd ed.), eq. 7.1, Gregorian branch. */
export function julianDateFromCalendar(date: CalendarDateTime): number {
  // Meeus counts January and February as months 13 and 14 of the previous year, so the
  // leap day falls at the end of the counting year.
  const isJanuaryOrFebruary = date.month <= 2;
  const year = isJanuaryOrFebruary ? date.year - 1 : date.year;
  const month = isJanuaryOrFebruary ? date.month + 12 : date.month;
  const century = Math.floor(year / 100);
  const gregorianCorrection = 2 - century + Math.floor(century / 4);
  const dayFraction = (date.hour + (date.minute + date.second / 60) / 60) / 24;
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    date.day +
    dayFraction +
    gregorianCorrection -
    1524.5
  );
}

/** Inverse of {@link julianDateFromCalendar}, rounded to the whole millisecond. */
export function calendarFromJulianDate(jd: number): CalendarDateTime {
  let dayNumber = Math.floor(jd + 0.5);
  // Rounding to whole milliseconds stops float noise turning 12:00:00 into 11:59:59.999….
  let msOfDay = Math.round((jd + 0.5 - dayNumber) * MS_PER_DAY);
  if (msOfDay === MS_PER_DAY) {
    dayNumber += 1;
    msOfDay = 0;
  }
  return { ...gregorianDateFromDayNumber(dayNumber), ...timeOfDayFromMs(msOfDay) };
}

/** Meeus ch. 7 ("Calculation of the Calendar Date from the JD"); letters as in the book. */
function gregorianDateFromDayNumber(dayNumber: number) {
  const alpha = Math.floor((dayNumber - 1_867_216.25) / 36_524.25);
  const a = dayNumber + 1 + alpha - Math.floor(alpha / 4);
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const month = e < 14 ? e - 1 : e - 13;
  return { year: month > 2 ? c - 4716 : c - 4715, month, day: b - d - Math.floor(30.6001 * e) };
}

function timeOfDayFromMs(msOfDay: number) {
  return {
    hour: Math.floor(msOfDay / 3_600_000),
    minute: Math.floor((msOfDay % 3_600_000) / 60_000),
    second: (msOfDay % 60_000) / 1000,
  };
}

/** Unix time skips leap seconds just as a UTC JD does, so this is exact outside a leap second. */
export function jdUtcFromUnixMs(unixMs: number): number {
  return JD_UNIX_EPOCH + unixMs / MS_PER_DAY;
}

/** Assumes no leap seconds after the last table entry. */
export function taiMinusUtcSeconds(jdUtc: number): number {
  const step = LEAP_SECOND_STEPS.findLast((candidate) => candidate.jdUtc <= jdUtc);
  if (step === undefined) {
    throw new RangeError(
      `UTC before 1972-01-01 has no leap-second offset (JD ${jdUtc}); pass TDB directly.`,
    );
  }
  return step.taiMinusUtcSeconds;
}

export function jdTtFromJdUtc(jdUtc: number): number {
  return jdUtc + (taiMinusUtcSeconds(jdUtc) + TT_MINUS_TAI_SECONDS) / SECONDS_PER_DAY;
}

/**
 * TDB − TT is periodic with amplitude ≤ 1.7 ms (Fairhead & Bretagnon 1990), about 50 m of
 * Earth's orbital motion, so TDB = TT here, as PLAN.md allows.
 */
export function jdTdbFromJdUtc(jdUtc: number): number {
  return jdTtFromJdUtc(jdUtc);
}
