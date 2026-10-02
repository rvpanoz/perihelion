/** A frame over this is a visible hitch at 60 fps (16.7 ms), with room for timer noise. */
export const HITCH_THRESHOLD_MS = 20;

/** Nearest-rank percentile: the smallest value with at least `fraction` of the frames at or below it. */
export function percentileMs(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(fraction * sorted.length));
  return sorted[rank - 1] ?? 0;
}
