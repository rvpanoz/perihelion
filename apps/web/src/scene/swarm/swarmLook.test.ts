import { NEO_ORBIT_CLASSES } from '@perihelion/data';
import fc from 'fast-check';
import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { BLOOM_SETTINGS, relativeLuminance } from '../effects/effectsConfig';
import { UNKNOWN_ABSOLUTE_MAGNITUDE } from './swarmAttributes';
import { SWARM_CLASS_COLORS, SWARM_LOOK, pointBrightness, pointSizePx } from './swarmLook';

const absoluteMagnitude = fc.double({ min: 5, max: 35, noNaN: true });
const { brightest, faintest } = SWARM_LOOK.absoluteMagnitudeRange;

describe('pointSizePx and pointBrightness', () => {
  it('never grow as H increases', () => {
    fc.assert(
      fc.property(absoluteMagnitude, absoluteMagnitude, (first, second) => {
        const [brighter, fainter] = first <= second ? [first, second] : [second, first];
        expect(pointSizePx(fainter)).toBeLessThanOrEqual(pointSizePx(brighter));
        expect(pointBrightness(fainter)).toBeLessThanOrEqual(pointBrightness(brighter));
      }),
    );
  });

  it('clamp outside the H range', () => {
    expect(pointSizePx(brightest - 5)).toBe(SWARM_LOOK.pointSizePx.brightest);
    expect(pointSizePx(faintest + 1)).toBe(SWARM_LOOK.pointSizePx.faintest);
    expect(pointBrightness(brightest - 5)).toBe(SWARM_LOOK.brightness.brightest);
    expect(pointBrightness(faintest + 1)).toBe(SWARM_LOOK.brightness.faintest);
  });

  it('give NEOs without an H the minimum', () => {
    expect(pointSizePx(UNKNOWN_ABSOLUTE_MAGNITUDE)).toBe(SWARM_LOOK.pointSizePx.faintest);
    expect(pointBrightness(UNKNOWN_ABSOLUTE_MAGNITUDE)).toBe(SWARM_LOOK.brightness.faintest);
  });
});

describe('SWARM_CLASS_COLORS', () => {
  it('has one distinct colour per orbit class', () => {
    expect(SWARM_CLASS_COLORS).toHaveLength(NEO_ORBIT_CLASSES.length);
    expect(new Set(SWARM_CLASS_COLORS).size).toBe(NEO_ORBIT_CLASSES.length);
  });

  // Always true while the colours are LDR (the threshold is 1). It guards against making them HDR, which would
  // make every single sprite glow instead of only dense stacks.
  it.each(SWARM_CLASS_COLORS)(
    'keeps one %s sprite at full brightness below the bloom threshold',
    (hex) => {
      const color = new Color(hex).multiplyScalar(SWARM_LOOK.brightness.brightest);
      expect(relativeLuminance(color)).toBeLessThan(BLOOM_SETTINGS.luminanceThreshold);
    },
  );
});
