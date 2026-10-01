import { describe, expect, it } from 'vitest';
import { CME_SHELL_LOOK } from './cmeShellLook';
import { SHELL_SEED_SIZE, createShellSeeds, mulberry32, shellSeedAt } from './cmeShellSeeds';

const COUNT = 20_000;
const seeds = createShellSeeds(COUNT, mulberry32(7));
const all = Array.from({ length: COUNT }, (_, index) => shellSeedAt(seeds, index));

describe('createShellSeeds', () => {
  it('is the same for the same seed', () => {
    expect(createShellSeeds(10, mulberry32(7))).toEqual(seeds.subarray(0, 10 * SHELL_SEED_SIZE));
  });

  it('keeps every seed component in range', () => {
    const { flankBrightnessRange, rimBrightnessRange, flankStartFraction } = CME_SHELL_LOOK;
    for (const seed of all) {
      expect(seed.capFraction).toBeGreaterThanOrEqual(0);
      expect(seed.capFraction).toBeLessThan(1);
      expect(seed.azimuthRad).toBeGreaterThanOrEqual(0);
      expect(seed.azimuthRad).toBeLessThan(2 * Math.PI);
      expect(seed.radiusFraction).toBeGreaterThanOrEqual(flankStartFraction);
      expect(seed.radiusFraction).toBeLessThanOrEqual(1);
      expect(seed.brightness).toBeGreaterThanOrEqual(flankBrightnessRange.min);
      expect(seed.brightness).toBeLessThanOrEqual(rimBrightnessRange.max);
    }
  });

  it('splits the particles into flanks, rim and cap, and crowds the leading edge', () => {
    const { flankShare, sheathFraction } = CME_SHELL_LOOK;
    const sheath = all.filter((seed) => seed.radiusFraction > 1 - sheathFraction);
    expect(1 - sheath.length / COUNT).toBeCloseTo(flankShare, 1);
    const front = sheath.filter((seed) => seed.radiusFraction > 1 - sheathFraction / 4);
    // Squared depth: half the sheath lies in its front quarter.
    expect(front.length / sheath.length).toBeCloseTo(0.5, 1);
  });
});
