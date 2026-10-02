/** Below 0.5 the scene is too blurred to judge; above 3 is past any real display and only measures fill rate. */
export const MIN_DEV_PIXEL_RATIO = 0.5;
export const MAX_DEV_PIXEL_RATIO = 3;

/**
 * The dev-only `?dpr=<n>`: a proxy run for a denser display (`?dpr=2` draws 4× the pixels of a DPR 1 screen).
 * Anything missing, unreadable or not positive leaves the canvas's own pixel ratio.
 */
export function devPixelRatioFromUrl(search: string): number | undefined {
  const pixelRatio = Number.parseFloat(new URLSearchParams(search).get('dpr') ?? '');
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) return undefined;
  return Math.min(Math.max(pixelRatio, MIN_DEV_PIXEL_RATIO), MAX_DEV_PIXEL_RATIO);
}
