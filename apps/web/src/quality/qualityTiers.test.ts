import { describe, expect, it } from 'vitest';
import { CME_SHELL_LOOK } from '../scene/eruption/cmeShellLook';
import { QUALITY_TIERS, QUALITY_TIER_NAMES, pixelRatioFor, stepTier } from './qualityTiers';

describe('quality tiers', () => {
  it('lists tiers from cheapest to richest', () => {
    expect(QUALITY_TIER_NAMES).toEqual(['low', 'medium', 'high']);
  });

  it('never gets more expensive going down a tier', () => {
    const { low, medium, high } = QUALITY_TIERS;
    for (const [cheaper, richer] of [
      [low, medium],
      [medium, high],
    ] as const) {
      expect(cheaper.maxPixelRatio).toBeLessThanOrEqual(richer.maxPixelRatio);
      expect(cheaper.multisampling).toBeLessThanOrEqual(richer.multisampling);
      expect(cheaper.bloomResolutionScale).toBeLessThanOrEqual(richer.bloomResolutionScale);
      expect(cheaper.cmeParticleCount).toBeLessThanOrEqual(richer.cmeParticleCount);
    }
  });

  it('keeps the Phase 6 exit check layout at High', () => {
    expect(QUALITY_TIERS.high.cmeParticleCount).toBe(24_000);
    expect(QUALITY_TIERS.high.cmeParticleCount).toBe(CME_SHELL_LOOK.particleCount);
  });

  it('steps one tier and stops at the ends', () => {
    expect(stepTier('medium', -1)).toBe('low');
    expect(stepTier('medium', 1)).toBe('high');
    expect(stepTier('low', -1)).toBeUndefined();
    expect(stepTier('high', 1)).toBeUndefined();
  });

  it('caps the pixel ratio but never raises it', () => {
    expect(pixelRatioFor(QUALITY_TIERS.medium, 2)).toBe(1.5);
    expect(pixelRatioFor(QUALITY_TIERS.high, 1)).toBe(1);
  });
});
