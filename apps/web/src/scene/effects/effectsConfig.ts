import { ToneMappingMode } from 'postprocessing';
import type { Color } from 'three';

/**
 * Threshold 1 in linear light: only HDR colours bloom, which today means the Sun (`SUN_GLOW_COLOR`). Planets and
 * lines are LDR and stay crisp.
 */
export const BLOOM_SETTINGS = {
  luminanceThreshold: 1,
  luminanceSmoothing: 0.2,
  intensity: 1.5,
  mipmapBlur: true,
} as const;

/** Applied once, at the end of the effect chain; the renderer itself does none (`<Canvas flat>`). */
export const TONE_MAPPING_MODE = ToneMappingMode.ACES_FILMIC;

/** Rec. 709 luma weights on linear RGB, the quantity the bloom threshold compares against. */
export function relativeLuminance(color: Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}
