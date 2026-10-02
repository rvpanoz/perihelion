import { HITCH_THRESHOLD_MS, percentileMs } from '../quality/frameStats';

const P90_FRACTION = 0.9;

export interface FrameTimeSummary {
  frames: number;
  medianMs: number;
  /** Nearest rank: the frame at or below which 90 % of frames fall, so it is always a measured frame. */
  p90Ms: number;
  worstMs: number;
  hitches: number;
}

export function summarizeFrameTimes(frameTimesMs: readonly number[]): FrameTimeSummary {
  const sorted = [...frameTimesMs].sort((a, b) => a - b);
  return {
    frames: sorted.length,
    medianMs: medianOfSorted(sorted),
    p90Ms: percentileMs(sorted, P90_FRACTION),
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
