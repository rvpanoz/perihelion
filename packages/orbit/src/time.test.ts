import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type CalendarDateTime,
  calendarFromJulianDate,
  jdTdbFromJdUtc,
  jdTtFromJdUtc,
  jdUtcFromUnixMs,
  julianDateFromCalendar,
  taiMinusUtcSeconds,
} from './time';

const SECONDS_PER_DAY = 86_400;

type CalendarDay = Pick<CalendarDateTime, 'year' | 'month' | 'day'> & Partial<CalendarDateTime>;

function jdAt(date: CalendarDay): number {
  return julianDateFromCalendar({ hour: 0, minute: 0, second: 0, ...date });
}

// Days capped at 28 so every generated date exists; month ends are covered by unit tests.
const calendarDateTime = fc.record({
  year: fc.integer({ min: 1600, max: 2400 }),
  month: fc.integer({ min: 1, max: 12 }),
  day: fc.integer({ min: 1, max: 28 }),
  hour: fc.integer({ min: 0, max: 23 }),
  minute: fc.integer({ min: 0, max: 59 }),
  second: fc.integer({ min: 0, max: 59_999 }).map((ms) => ms / 1000),
});

describe('julianDateFromCalendar', () => {
  // Reference values from Meeus, Astronomical Algorithms (2nd ed.), ch. 7.
  it.each([
    [{ year: 2000, month: 1, day: 1, hour: 12 }, 2_451_545.0],
    [{ year: 1957, month: 10, day: 4, hour: 19, minute: 26, second: 24 }, 2_436_116.31],
    [{ year: 1987, month: 1, day: 27 }, 2_446_822.5],
    [{ year: 1987, month: 6, day: 19, hour: 12 }, 2_446_966.0],
    [{ year: 1988, month: 6, day: 19, hour: 12 }, 2_447_332.0],
    [{ year: 1900, month: 1, day: 1 }, 2_415_020.5],
    [{ year: 1600, month: 12, day: 31 }, 2_305_812.5],
    [{ year: 1970, month: 1, day: 1 }, 2_440_587.5],
  ])('converts %o to JD %d', (date, expectedJd) => {
    expect(jdAt(date)).toBeCloseTo(expectedJd, 8);
  });

  it('applies the Gregorian leap-year rule', () => {
    expect(jdAt({ year: 2000, month: 2, day: 29 })).toBe(2_451_603.5);
    expect(jdAt({ year: 1900, month: 3, day: 1 }) - jdAt({ year: 1900, month: 2, day: 28 })).toBe(
      1,
    );
  });

  it('agrees with Date.UTC for any date', () => {
    fc.assert(
      fc.property(calendarDateTime, (date) => {
        const secondMs = Math.round(date.second * 1000);
        const { year, month, day, hour, minute } = date;
        const unixMs = Date.UTC(year, month - 1, day, hour, minute, 0, secondMs);
        expect(jdUtcFromUnixMs(unixMs)).toBeCloseTo(julianDateFromCalendar(date), 8);
      }),
    );
  });
});

describe('calendarFromJulianDate', () => {
  it('converts Meeus example 7.c', () => {
    expect(calendarFromJulianDate(2_436_116.31)).toEqual({
      year: 1957,
      month: 10,
      day: 4,
      hour: 19,
      minute: 26,
      second: 24,
    });
  });

  it('inverts julianDateFromCalendar to the millisecond', () => {
    fc.assert(
      fc.property(calendarDateTime, (date) => {
        expect(calendarFromJulianDate(julianDateFromCalendar(date))).toEqual(date);
      }),
    );
  });
});

describe('jdUtcFromUnixMs', () => {
  it('maps the Unix epoch and J2000.0', () => {
    expect(jdUtcFromUnixMs(0)).toBe(2_440_587.5);
    expect(jdUtcFromUnixMs(Date.UTC(2000, 0, 1, 12))).toBe(2_451_545.0);
  });
});

describe('taiMinusUtcSeconds', () => {
  // Values from IERS Bulletin C / USNO tai-utc.dat.
  it.each([
    [{ year: 1972, month: 1, day: 1 }, 10],
    [{ year: 1998, month: 12, day: 31, hour: 23, minute: 59, second: 59 }, 31],
    [{ year: 1999, month: 1, day: 1 }, 32],
    [{ year: 2009, month: 1, day: 1 }, 34],
    [{ year: 2016, month: 12, day: 31, hour: 23, minute: 59, second: 59 }, 36],
    [{ year: 2017, month: 1, day: 1 }, 37],
    [{ year: 2026, month: 9, day: 28 }, 37],
  ])('is correct at %o', (date, expectedSeconds) => {
    expect(taiMinusUtcSeconds(jdAt(date))).toBe(expectedSeconds);
  });

  it('rejects UTC before 1972, which has no leap-second definition', () => {
    expect(() => taiMinusUtcSeconds(jdAt({ year: 1971, month: 12, day: 31 }))).toThrow(RangeError);
  });
});

describe('jdTtFromJdUtc', () => {
  it.each([
    [{ year: 2000, month: 1, day: 1, hour: 12 }, 64.184],
    [{ year: 2017, month: 1, day: 1 }, 69.184],
  ])('offsets %o by TAI − UTC + 32.184 s', (date, expectedSeconds) => {
    const jdUtc = jdAt(date);
    expect((jdTtFromJdUtc(jdUtc) - jdUtc) * SECONDS_PER_DAY).toBeCloseTo(expectedSeconds, 3);
  });
});

describe('jdTdbFromJdUtc', () => {
  it('equals TT, which PLAN.md accepts (|TDB − TT| ≤ 1.7 ms)', () => {
    const jdUtc = jdAt({ year: 2026, month: 9, day: 28 });
    expect(jdTdbFromJdUtc(jdUtc)).toBe(jdTtFromJdUtc(jdUtc));
  });
});
