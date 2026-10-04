import { describe, expect, it } from 'vitest';
import { QUALITY_TIERS } from '../quality/qualityTiers';
import { ANTIALIASING_CHOICES, antialiasingFromUrl, multisamplingFor } from './devAntialiasing';

describe('antialiasingFromUrl', () => {
  it.each(ANTIALIASING_CHOICES)('reads ?aa=%s', (choice) => {
    expect(antialiasingFromUrl(`?bench=overview&aa=${choice}`)).toBe(choice);
  });

  it.each(['', '?aa=', '?aa=msaa8', '?aa=none', '?dpr=2'])('leaves %s to the tier', (search) => {
    expect(antialiasingFromUrl(search)).toBeUndefined();
  });
});

describe('multisamplingFor', () => {
  it('uses the tier when no run asked for anything else', () => {
    for (const tier of Object.values(QUALITY_TIERS)) {
      expect(multisamplingFor(tier, undefined)).toBe(tier.multisampling);
    }
  });

  it.each([
    ['msaa4', 4],
    ['msaa2', 2],
    ['off', 0],
  ] as const)('draws %s at %i samples', (choice, samples) => {
    expect(multisamplingFor(QUALITY_TIERS.high, choice)).toBe(samples);
  });

  // A post pass is the alternative to multisampling, not an addition to it.
  it.each(['fxaa', 'smaa'] as const)('turns multisampling off for %s', (choice) => {
    expect(multisamplingFor(QUALITY_TIERS.high, choice)).toBe(0);
  });
});
