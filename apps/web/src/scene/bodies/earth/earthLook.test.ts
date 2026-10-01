import { describe, expect, it } from 'vitest';
import { EARTH_LOOK, daylightFactor } from './earthLook';

describe('daylightFactor', () => {
  it('is 0 at night, ½ on the terminator and 1 in daylight', () => {
    expect(daylightFactor(-0.5)).toBe(0);
    expect(daylightFactor(0)).toBe(0.5);
    expect(daylightFactor(0.5)).toBe(1);
  });

  it('blends only within the twilight band', () => {
    expect(daylightFactor(-EARTH_LOOK.twilightWidth)).toBe(0);
    expect(daylightFactor(EARTH_LOOK.twilightWidth)).toBe(1);
  });
});
