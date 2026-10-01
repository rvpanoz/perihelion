import { describe, expect, it } from 'vitest';
import { IMPACT_LOOK } from './impactLook';
import { impactLevel, impactStrength, lerpByLevel } from './impactTiming';

const ARRIVAL_JD_TDB = 2_461_290.25;
const HOUR = 1 / 24;
const FULL_HIT = { arrivalJdTdb: ARRIVAL_JD_TDB, strength: 1 };

describe('impactStrength', () => {
  it('softens a glancing blow and a minor impact, as ENLIL flags them', () => {
    expect(impactStrength({ isGlancingBlow: false, isMinorImpact: false })).toBe(1);
    expect(impactStrength({ isGlancingBlow: true, isMinorImpact: false })).toBe(
      IMPACT_LOOK.glancingBlowStrength,
    );
    expect(impactStrength({ isGlancingBlow: true, isMinorImpact: true })).toBe(
      IMPACT_LOOK.glancingBlowStrength * IMPACT_LOOK.minorImpactStrength,
    );
  });
});

describe('impactLevel', () => {
  it("is 0 before the rise, the strength at ENLIL's arrival, and fades after it", () => {
    expect(impactLevel(FULL_HIT, ARRIVAL_JD_TDB - (IMPACT_LOOK.riseHours + 1) * HOUR)).toBe(0);
    expect(impactLevel(FULL_HIT, ARRIVAL_JD_TDB)).toBe(1);
    expect(impactLevel({ ...FULL_HIT, strength: 0.6 }, ARRIVAL_JD_TDB)).toBe(0.6);
    expect(impactLevel(FULL_HIT, ARRIVAL_JD_TDB + IMPACT_LOOK.decayHours * HOUR)).toBeCloseTo(
      Math.exp(-1),
      12,
    );
  });

  it('rises through the hours before arrival', () => {
    const halfway = impactLevel(FULL_HIT, ARRIVAL_JD_TDB - (IMPACT_LOOK.riseHours / 2) * HOUR);
    expect(halfway).toBeCloseTo(0.5, 12);
  });

  it('ends: nothing is drawn days later', () => {
    expect(impactLevel(FULL_HIT, ARRIVAL_JD_TDB + 5)).toBe(0);
  });
});

describe('lerpByLevel', () => {
  it('runs from the quiet value to the storm value and clamps', () => {
    expect(lerpByLevel(10, 6.6, 0)).toBe(10);
    expect(lerpByLevel(10, 6.6, 1)).toBe(6.6);
    expect(lerpByLevel(10, 6.6, 2)).toBe(6.6);
  });
});
