import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { BLOOM_SETTINGS, relativeLuminance } from '../../effects/effectsConfig';
import { SUN_LOOK, coronaFalloffFactor, limbDarkeningFactor } from './sunLook';

describe('limbDarkeningFactor', () => {
  it('is 1 at disc centre and 1 − u at the limb, falling in between', () => {
    expect(limbDarkeningFactor(1, 0.6)).toBe(1);
    expect(limbDarkeningFactor(0, 0.6)).toBeCloseTo(0.4, 15);
    expect(limbDarkeningFactor(0.5, 0.6)).toBeCloseTo(0.7, 15);
  });

  it('darkens the limb most in the blue, so the limb reddens', () => {
    const [red, green, blue] = SUN_LOOK.limbDarkening;
    expect(red).toBeLessThan(green);
    expect(green).toBeLessThan(blue);
  });

  it('blooms at disc centre on average, and not in a dark granule', () => {
    const [red, green, blue] = SUN_LOOK.photosphereColor;
    const centre = new Color(red, green, blue);
    expect(relativeLuminance(centre)).toBeGreaterThan(BLOOM_SETTINGS.luminanceThreshold);
    const darkest = centre.multiplyScalar(1 - SUN_LOOK.granulationContrast);
    expect(relativeLuminance(darkest)).toBeLessThan(BLOOM_SETTINGS.luminanceThreshold);
  });
});

describe('coronaFalloffFactor', () => {
  it('is 1 at the limb, nothing inside it, and falls outward', () => {
    expect(coronaFalloffFactor(0.5)).toBe(0);
    expect(coronaFalloffFactor(1)).toBe(1);
    expect(coronaFalloffFactor(2)).toBe(2 ** -SUN_LOOK.coronaFalloff);
    expect(coronaFalloffFactor(3)).toBeLessThan(coronaFalloffFactor(2));
  });
});
