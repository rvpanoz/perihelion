import { QUALITY_TIER_NAMES, type QualityTierName } from '../quality/qualityTiers';

/**
 * The dev-only `?tier=low|medium|high`: a bench run reloads the page, so the tier it measures has to come from the
 * URL. Anything else leaves the store's own tier.
 */
export function devTierNameFromUrl(search: string): QualityTierName | undefined {
  const requested = new URLSearchParams(search).get('tier');
  return QUALITY_TIER_NAMES.find((name) => name === requested);
}
