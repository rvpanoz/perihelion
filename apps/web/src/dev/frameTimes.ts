/** A frame over this is a visible hitch at 60 fps (16.7 ms), with room for timer noise. */
export const HITCH_THRESHOLD_MS = 20;

export interface FrameTimeSummary {
  frames: number;
  medianMs: number;
  worstMs: number;
  hitches: number;
}

export function summarizeFrameTimes(frameTimesMs: readonly number[]): FrameTimeSummary {
  const sorted = [...frameTimesMs].sort((a, b) => a - b);
  return {
    frames: sorted.length,
    medianMs: medianOfSorted(sorted),
    worstMs: sorted.at(-1) ?? 0,
    hitches: sorted.filter((frameMs) => frameMs > HITCH_THRESHOLD_MS).length,
  };
}

/** When each hitch ended, in ms from the start of the recording, so a start-up stall can be told from one mid-move. */
export function hitchTimesMs(frameTimesMs: readonly number[]): number[] {
  let elapsedMs = 0;
  return frameTimesMs.flatMap((frameMs) => {
    elapsedMs += frameMs;
    return frameMs > HITCH_THRESHOLD_MS ? [Math.round(elapsedMs)] : [];
  });
}

export function medianMs(values: readonly number[]): number {
  return medianOfSorted([...values].sort((a, b) => a - b));
}

function medianOfSorted(sorted: readonly number[]): number {
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
