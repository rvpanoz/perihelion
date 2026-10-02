import { CME_SHELL_LOOK } from '../scene/eruption/cmeShellLook';

/** Cheapest first, so a step down is index − 1. */
export const QUALITY_TIER_NAMES = ['low', 'medium', 'high'] as const;
export type QualityTierName = (typeof QUALITY_TIER_NAMES)[number];

export interface QualityTier {
  maxPixelRatio: number;
  /** Composer MSAA samples; the canvas's own antialias is off because the composer renders off-screen. */
  multisampling: number;
  /** Bloom's working resolution as a share of the canvas; postprocessing's default is 0.5. */
  bloomResolutionScale: number;
  trailsByDefault: boolean;
  cmeParticleCount: number;
}

/**
 * Every tier draws every NEO: points are cheap and the count is shown as a fact. Bloom stays on at every tier because
 * the Sun's look is built on it (`sunLook.ts`). High keeps today's bloom and halves today's 8× MSAA, and keeps the
 * shell layout the Phase 6 exit check measured (decision 4).
 */
export const QUALITY_TIERS = {
  low: {
    maxPixelRatio: 1,
    multisampling: 0,
    bloomResolutionScale: 0.25,
    trailsByDefault: false,
    cmeParticleCount: CME_SHELL_LOOK.particleCount / 4,
  },
  medium: {
    maxPixelRatio: 1.5,
    multisampling: 2,
    bloomResolutionScale: 0.25,
    trailsByDefault: true,
    cmeParticleCount: CME_SHELL_LOOK.particleCount / 2,
  },
  high: {
    maxPixelRatio: 2,
    multisampling: 4,
    bloomResolutionScale: 0.5,
    trailsByDefault: true,
    cmeParticleCount: CME_SHELL_LOOK.particleCount,
  },
} as const satisfies Record<QualityTierName, QualityTier>;

export function stepTier(name: QualityTierName, direction: -1 | 1): QualityTierName | undefined {
  return QUALITY_TIER_NAMES[QUALITY_TIER_NAMES.indexOf(name) + direction];
}

export function pixelRatioFor(tier: QualityTier, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, tier.maxPixelRatio);
}
