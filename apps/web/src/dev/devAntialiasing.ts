import type { QualityTier } from '../quality/qualityTiers';

/**
 * The dev-only `?aa=`: one page load per antialiasing configuration, so a bench run can compare them on the same
 * shot. MSAA happens inside the composer's own buffer; FXAA and SMAA are passes after tone mapping, and turn
 * multisampling off, since they are the alternative to it rather than an addition.
 */
export const ANTIALIASING_CHOICES = ['msaa4', 'msaa2', 'off', 'fxaa', 'smaa'] as const;
export type AntialiasingChoice = (typeof ANTIALIASING_CHOICES)[number];

const MULTISAMPLING: Record<AntialiasingChoice, number> = {
  msaa4: 4,
  msaa2: 2,
  off: 0,
  fxaa: 0,
  smaa: 0,
};

/** Anything missing or unknown leaves the quality tier's own setting. */
export function antialiasingFromUrl(search: string): AntialiasingChoice | undefined {
  const choice = new URLSearchParams(search).get('aa');
  return ANTIALIASING_CHOICES.find((known) => known === choice);
}

export function multisamplingFor(
  tier: QualityTier,
  choice: AntialiasingChoice | undefined,
): number {
  return choice ? MULTISAMPLING[choice] : tier.multisampling;
}
