import { HITCH_THRESHOLD_MS, percentileMs } from './frameStats';
import { type QualityTierName, stepTier } from './qualityTiers';

export const GOVERNOR_SETTINGS = {
  /** After start-up and after every tier change (the composer remounts), frames say nothing yet. */
  warmUpMs: 2_000,
  windowMs: 2_000,
  /** Above a 60 Hz display's 16.7 ms cap with room for vsync jitter (Review Focus 1). */
  slowP90Ms: HITCH_THRESHOLD_MS,
  slowWindowsBeforeDrop: 2,
  steadyMsBeforeProbe: 60_000,
  /** Longer frames are a hidden tab or a stall with a known cause, not rendering cost. */
  ignoredFrameMs: 250,
} as const;

/**
 * Picks the tier from frame times, mostly downward: on a 60 Hz display vsync holds every frame near 16.7 ms, so
 * frame times cannot show headroom. It probes one tier up after a steady minute; a probe that turns slow drops back
 * and locks the tier for the session, so quality never flickers (decision 5).
 */
export class TierGovernor {
  #tier: QualityTierName;
  #warmUpLeftMs: number = GOVERNOR_SETTINGS.warmUpMs;
  #window: number[] = [];
  #windowMs = 0;
  #slowWindows = 0;
  #steadyMs = 0;
  #probing = false;
  #locked = false;

  constructor(tier: QualityTierName) {
    this.#tier = tier;
  }

  get tier(): QualityTierName {
    return this.#tier;
  }

  /** Returns true when this frame changed the tier. */
  recordFrame(frameMs: number): boolean {
    if (frameMs > GOVERNOR_SETTINGS.ignoredFrameMs) return false;
    if (this.#warmUpLeftMs > 0) {
      this.#warmUpLeftMs -= frameMs;
      return false;
    }
    this.#window.push(frameMs);
    this.#windowMs += frameMs;
    return this.#windowMs >= GOVERNOR_SETTINGS.windowMs && this.#closeWindow();
  }

  discardWindow(): void {
    this.#window = [];
    this.#windowMs = 0;
  }

  #closeWindow(): boolean {
    const slow = percentileMs(this.#window, 0.9) > GOVERNOR_SETTINGS.slowP90Ms;
    const windowMs = this.#windowMs;
    this.discardWindow();
    return slow ? this.#afterSlowWindow() : this.#afterSteadyWindow(windowMs);
  }

  #afterSlowWindow(): boolean {
    this.#steadyMs = 0;
    this.#slowWindows += 1;
    if (this.#slowWindows < GOVERNOR_SETTINGS.slowWindowsBeforeDrop) return false;
    if (this.#probing) this.#locked = true;
    this.#probing = false;
    return this.#step(-1);
  }

  #afterSteadyWindow(windowMs: number): boolean {
    this.#slowWindows = 0;
    this.#steadyMs += windowMs;
    if (this.#steadyMs < GOVERNOR_SETTINGS.steadyMsBeforeProbe) return false;
    this.#steadyMs = 0;
    this.#probing = !this.#locked && this.#step(1);
    return this.#probing;
  }

  #step(direction: -1 | 1): boolean {
    const next = stepTier(this.#tier, direction);
    if (next === undefined) return false;
    this.#tier = next;
    this.#slowWindows = 0;
    this.#warmUpLeftMs = GOVERNOR_SETTINGS.warmUpMs;
    return true;
  }
}
