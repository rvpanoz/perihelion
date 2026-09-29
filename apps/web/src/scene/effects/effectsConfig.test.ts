import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { BODY_APPEARANCE, BODY_IDS, SUN_GLOW_COLOR } from '../bodies/bodyCatalog';
import { BLOOM_SETTINGS, relativeLuminance } from './effectsConfig';

describe('bloom', () => {
  it('lets the Sun’s HDR glow cross the threshold', () => {
    expect(relativeLuminance(SUN_GLOW_COLOR)).toBeGreaterThan(BLOOM_SETTINGS.luminanceThreshold);
  });

  it.each(BODY_IDS)('keeps the %s colour below the threshold', (body) => {
    const color = new Color(BODY_APPEARANCE[body].color);
    expect(relativeLuminance(color)).toBeLessThan(BLOOM_SETTINGS.luminanceThreshold);
  });
});
