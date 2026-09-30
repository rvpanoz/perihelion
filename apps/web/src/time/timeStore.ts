import {
  DEFAULT_RATE_DAYS_PER_SECOND,
  type TimeState,
  advanceTime,
  clampJdTdb,
  clampRate,
  jdTdbFromUnixMs,
} from './timeController';

export interface TimeStoreOptions {
  initial: TimeState;
  nowUnixMs?: () => number;
}

/**
 * The single time source. The frame loop reads `state` and calls `tick` without notifying anyone; user actions
 * notify subscribers so the controls update at once instead of on their next 4 Hz poll.
 */
export class TimeStore {
  readonly #state: TimeState;
  readonly #nowUnixMs: () => number;
  readonly #listeners = new Set<() => void>();

  constructor(options: TimeStoreOptions) {
    this.#state = { ...options.initial, jdTdb: clampJdTdb(options.initial.jdTdb) };
    this.#nowUnixMs = options.nowUnixMs ?? Date.now;
  }

  get state(): Readonly<TimeState> {
    return this.#state;
  }

  tick(elapsedSeconds: number): void {
    advanceTime(this.#state, elapsedSeconds);
  }

  setPlaying(playing: boolean): void {
    this.#state.playing = playing;
    this.#notify();
  }

  setRate(rateDaysPerSecond: number): void {
    this.setScriptedRate(rateDaysPerSecond);
    this.#notify();
  }

  /** For scripts that change the rate every frame: like `tick`, it wakes no one; the 4 Hz readout picks it up. */
  setScriptedRate(rateDaysPerSecond: number): void {
    this.#state.rateDaysPerSecond = clampRate(rateDaysPerSecond);
  }

  scrubTo(jdTdb: number): void {
    this.#state.jdTdb = clampJdTdb(jdTdb);
    this.#notify();
  }

  jumpToNow(): void {
    this.scrubTo(jdTdbFromUnixMs(this.#nowUnixMs()));
  }

  /** An arrow property so it can be passed to `useSyncExternalStore` unbound. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const timeStore = new TimeStore({
  initial: {
    jdTdb: jdTdbFromUnixMs(Date.now()),
    rateDaysPerSecond: DEFAULT_RATE_DAYS_PER_SECOND,
    playing: true,
  },
});
