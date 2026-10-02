import { describe, expect, it, vi } from 'vitest';
import { BENCH_RECORD_MS, BENCH_SETTLE_MS, BenchRun } from './benchRun';

const FRAME_MS = 100;

function runWithFlight(flightFrames: number) {
  let flying = 0;
  const start = vi.fn(() => {
    flying = flightFrames;
  });
  const isFlying = () => {
    flying = Math.max(flying - 1, 0);
    return flying > 0;
  };
  return { run: new BenchRun({ subject: 'sun', start }, isFlying), start };
}

function framesUntilDone(run: BenchRun): { frames: number; recorded: readonly number[] } {
  for (let frames = 1; frames < 1000; frames += 1) {
    const recorded = run.frame(FRAME_MS);
    if (recorded) return { frames, recorded };
  }
  throw new Error('the run never finished');
}

describe('BenchRun', () => {
  it('starts the shot on its first frame, once', () => {
    const { run, start } = runWithFlight(0);
    run.frame(FRAME_MS);
    run.frame(FRAME_MS);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('records 10 s after the flight lands and 1 s settles', () => {
    const flightFrames = 25;
    const { run } = runWithFlight(flightFrames);
    const { frames, recorded } = framesUntilDone(run);
    const settleFrames = BENCH_SETTLE_MS / FRAME_MS;
    const recordFrames = BENCH_RECORD_MS / FRAME_MS;
    expect(recorded).toHaveLength(recordFrames);
    expect(frames).toBe(1 + flightFrames + settleFrames + recordFrames - 1);
  });

  it('reports once, then stays quiet', () => {
    const { run } = runWithFlight(0);
    framesUntilDone(run);
    expect(run.frame(FRAME_MS)).toBeUndefined();
  });

  it('keeps the frame times it was given', () => {
    const { run } = runWithFlight(0);
    run.frame(FRAME_MS);
    for (let settled = 0; settled < BENCH_SETTLE_MS; settled += FRAME_MS) run.frame(FRAME_MS);
    run.frame(25);
    expect(run.frame(BENCH_RECORD_MS)).toEqual([25, BENCH_RECORD_MS]);
  });
});
