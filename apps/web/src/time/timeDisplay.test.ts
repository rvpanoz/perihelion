import { jdTdbFromJdUtc, julianDateFromCalendar } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RATE_LIMITS_DAYS_PER_SECOND } from './timeController';
import {
  formatRate,
  formatSimulationDate,
  rateFromSliderPosition,
  sliderPositionFromRate,
} from './timeDisplay';

describe('formatSimulationDate', () => {
  it('shows UTC from 1972 on', () => {
    const jdUtc = julianDateFromCalendar({
      year: 2017,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    });
    expect(formatSimulationDate(jdTdbFromJdUtc(jdUtc))).toBe('2017-01-01 00:00 UTC');
  });

  it('shows J2000 (TDB noon) as 11:58 UTC', () => {
    expect(formatSimulationDate(2_451_545)).toBe('2000-01-01 11:58 UTC');
  });

  it('shows TDB, without throwing, before UTC had leap seconds', () => {
    const jdTdb = julianDateFromCalendar({
      year: 1850,
      month: 6,
      day: 1,
      hour: 6,
      minute: 30,
      second: 0,
    });
    expect(formatSimulationDate(jdTdb)).toBe('1850-06-01 06:30 TDB');
  });
});

describe('speed slider', () => {
  it('spans real time to 10 years per second', () => {
    expect(rateFromSliderPosition(0)).toBeCloseTo(RATE_LIMITS_DAYS_PER_SECOND.min, 15);
    expect(rateFromSliderPosition(1)).toBeCloseTo(RATE_LIMITS_DAYS_PER_SECOND.max, 9);
  });

  it('round-trips slider positions', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (position) => {
        expect(sliderPositionFromRate(rateFromSliderPosition(position))).toBeCloseTo(position, 12);
      }),
    );
  });

  it('labels rates in the largest whole unit', () => {
    expect(formatRate(RATE_LIMITS_DAYS_PER_SECOND.min)).toBe('real time');
    expect(formatRate(1 / 24)).toBe('1.0 h/s');
    expect(formatRate(1)).toBe('1.0 d/s');
    expect(formatRate(3_652.5)).toBe('10 yr/s');
  });
});
