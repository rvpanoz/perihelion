import type { BenchShot } from './benchScenarios';

/** After a flight lands, the chase and any first-use shader work settle before timing starts. */
export const BENCH_SETTLE_MS = 1000;
/** The Phase 4 and 5 exit runs' length, so the baseline compares with their numbers. */
export const BENCH_RECORD_MS = 10_000;

type BenchPhase = 'start' | 'landing' | 'settling' | 'recording' | 'done';

/**
 * One timed scenario, fed every frame: starts the shot, waits for its camera flight to land (measuring a flight
 * would mix the move into the steady numbers), settles, then records. Pure, so the probe stays a thin adapter.
 */
export class BenchRun {
  #phase: BenchPhase = 'start';
  #settledMs = 0;
  #recordedMs = 0;
  readonly #frameTimesMs: number[] = [];
  readonly #shot: BenchShot;
  readonly #isFlying: () => boolean;

  constructor(shot: BenchShot, isFlying: () => boolean) {
    this.#shot = shot;
    this.#isFlying = isFlying;
  }

  /** Returns the recorded frame times once, on the frame the recording completes. */
  frame(frameMs: number): readonly number[] | undefined {
    if (this.#phase === 'start') return this.#start();
    if (this.#phase === 'landing' && this.#isFlying()) return undefined;
    if (this.#phase === 'landing') this.#phase = 'settling';
    if (this.#phase === 'settling') return this.#settle(frameMs);
    if (this.#phase === 'recording') return this.#record(frameMs);
    return undefined;
  }

  #start(): undefined {
    this.#shot.start();
    this.#phase = 'landing';
    return undefined;
  }

  #settle(frameMs: number): undefined {
    this.#settledMs += frameMs;
    if (this.#settledMs >= BENCH_SETTLE_MS) this.#phase = 'recording';
    return undefined;
  }

  #record(frameMs: number): readonly number[] | undefined {
    this.#frameTimesMs.push(frameMs);
    this.#recordedMs += frameMs;
    if (this.#recordedMs < BENCH_RECORD_MS) return undefined;
    this.#phase = 'done';
    return this.#frameTimesMs;
  }
}
