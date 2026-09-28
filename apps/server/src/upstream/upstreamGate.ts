import type { Clock } from '../clock.js';
import { type HttpClient, UpstreamError } from './httpClient.js';

interface UpstreamGateOptions {
  minIntervalMs: number;
  clock: Clock;
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One request at a time per upstream host, spaced out, and none at all while the host has asked us to
 * back off (HTTP 429). Refused callers fall back to cached or snapshot data instead of waiting.
 */
export class UpstreamGate {
  readonly #options: Required<UpstreamGateOptions>;
  #queue: Promise<unknown> = Promise.resolve();
  #nextAllowedAtMs = 0;
  #backOffUntilMs = 0;

  constructor(options: UpstreamGateOptions) {
    this.#options = { ...options, sleep: options.sleep ?? realSleep };
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(() => this.#runInTurn(task));
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #runInTurn<T>(task: () => Promise<T>): Promise<T> {
    this.#refuseWhileBackingOff();
    await this.#waitForInterval();
    return this.#runAndRecord(task);
  }

  #refuseWhileBackingOff(): void {
    if (this.#options.clock.now() < this.#backOffUntilMs) {
      throw new UpstreamError(
        `Upstream asked us to back off until ${new Date(this.#backOffUntilMs).toISOString()}`,
      );
    }
  }

  async #waitForInterval(): Promise<void> {
    const waitMs = this.#nextAllowedAtMs - this.#options.clock.now();
    if (waitMs > 0) await this.#options.sleep(waitMs);
  }

  /** The interval runs from when a request ends, so a slow upstream is never hit back to back. */
  async #runAndRecord<T>(task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch (error) {
      this.#noteBackOff(error);
      throw error;
    } finally {
      this.#nextAllowedAtMs = this.#options.clock.now() + this.#options.minIntervalMs;
    }
  }

  #noteBackOff(error: unknown): void {
    if (error instanceof UpstreamError && error.retryAfterMs !== null) {
      this.#backOffUntilMs = this.#options.clock.now() + error.retryAfterMs;
    }
  }
}

export function gatedHttpClient(client: HttpClient, gate: UpstreamGate): HttpClient {
  return { getJson: (url) => gate.run(() => client.getJson(url)) };
}
