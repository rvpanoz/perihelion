import type { NeoOrbitClass } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import {
  NO_APPROACHES_TEXT,
  approachDateText,
  approachLabel,
  approachUtcText,
  closenessFraction,
  distanceTexts,
  groupApproaches,
  orbitClassLabel,
  speedText,
} from './approachFormat';

describe('distanceTexts', () => {
  it("keeps CAD's AU exactly and converts with exact constants", () => {
    // 0.05 × 149,597,870.7 = 7,479,893.535 km; ÷ 384,400 = 19.4586… LD.
    expect(distanceTexts(0.05)).toEqual({
      au: '0.05 AU',
      km: '7,479,894 km',
      lunar: '19.46 LD',
    });
  });

  it('never rounds the AU figure', () => {
    // 0.0123456789 AU = 1,846,887.276 km = 4.8046 LD.
    expect(distanceTexts(0.0123456789)).toEqual({
      au: '0.0123456789 AU',
      km: '1,846,887 km',
      lunar: '4.80 LD',
    });
  });
});

describe('NO_APPROACHES_TEXT', () => {
  it("states CAD's 0.05 AU cut in AU and LD", () => {
    expect(NO_APPROACHES_TEXT).toBe(
      'No asteroid passes within 0.05 AU (19.46 LD) of Earth in this window.',
    );
  });
});

describe('speedText', () => {
  it("prints CAD's value as given", () => {
    expect(speedText(12.345678)).toBe('12.345678 km/s');
  });
});

describe('approachDateText', () => {
  it("labels CAD's calendar string as TDB", () => {
    expect(approachDateText({ approachCalendarTdb: '2026-Sep-30 04:12' })).toBe(
      '2026-Sep-30 04:12 TDB',
    );
  });
});

describe('approachLabel', () => {
  it("trims CAD's padded full name", () => {
    expect(approachLabel({ fullName: '       (2024 XY1)' })).toBe('(2024 XY1)');
  });
});

describe('approachUtcText', () => {
  it('converts CAD’s TDB to UTC and rounds to the minute', () => {
    // 2026-Sep-30 04:12:00 TDB = JD 2461313.675; UTC = TDB − 69.184 s = 04:10:50.8 → 04:11.
    expect(approachUtcText({ approachJdTdb: 2_461_313.675 })).toBe('Sep 30 · 04:11 UTC');
  });

  it('carries a rounded minute into the next day', () => {
    // 2026-Oct-01 00:00:49.184 TDB = 2026-Sep-30 23:59:40 UTC, which rounds up to midnight.
    expect(approachUtcText({ approachJdTdb: 2_461_314.5 + 49.184 / 86_400 })).toBe(
      'Oct 1 · 00:00 UTC',
    );
  });
});

describe('closenessFraction', () => {
  it("is linear inside CAD's 0.05 AU cut and clamped outside it", () => {
    expect(closenessFraction(0)).toBe(1);
    expect(closenessFraction(0.0125)).toBeCloseTo(0.75, 12);
    expect(closenessFraction(0.05)).toBe(0);
    expect(closenessFraction(0.06)).toBe(0);
  });
});

describe('orbitClassLabel', () => {
  it('names the four NEO classes and marks a missing one', () => {
    expect(
      ['APO', 'ATE', 'AMO', 'IEO'].map((code) => orbitClassLabel(code as NeoOrbitClass)),
    ).toEqual(['Apollo', 'Aten', 'Amor', 'Atira']);
    expect(orbitClassLabel(null)).toBe('—');
  });
});

describe('groupApproaches', () => {
  it('splits at now, keeping CAD order in each group', () => {
    const early = { approachJdTdb: 1 };
    const late = { approachJdTdb: 3 };
    const atNow = { approachJdTdb: 2 };
    expect(groupApproaches({ approaches: [early, late, atNow], nowJdTdb: 2 })).toEqual({
      passed: [early],
      coming: [late, atNow],
    });
  });
});
