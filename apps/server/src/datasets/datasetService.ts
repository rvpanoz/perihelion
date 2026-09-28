import type { Clock } from '../clock.js';
import { DatasetUnavailableError } from '../errors.js';
import type {
  CachedDataset,
  DatasetCache,
  DatasetLogger,
  DatasetRequest,
  ServedDataset,
  SnapshotReader,
} from './types.js';

/** After an upstream failure, reads stop calling upstream for this long (Review Focus 1). */
export const FAILURE_BACKOFF_MS = 60_000;

interface DatasetServiceDependencies {
  cache: DatasetCache;
  snapshots: SnapshotReader;
  clock: Clock;
  logger: DatasetLogger;
}

/**
 * Serves each dataset from the SQLite cache while fresh; once stale, serves it anyway and refreshes in
 * the background (stale-while-revalidate). With no cached copy it fetches upstream, and falls back to
 * the bundled snapshot when that fails, so a dead upstream API degrades the app instead of breaking it.
 */
export class DatasetService {
  readonly #deps: DatasetServiceDependencies;
  readonly #inFlight = new Map<string, Promise<CachedDataset>>();
  readonly #lastFailureAtMs = new Map<string, number>();

  constructor(dependencies: DatasetServiceDependencies) {
    this.#deps = dependencies;
  }

  async read(request: DatasetRequest): Promise<ServedDataset> {
    const cached = this.#deps.cache.read(request.cacheKey);
    if (cached === undefined) return this.#fetchOrFallBack(request);
    if (this.#isFresh(cached, request)) return { ...cached, origin: 'fresh' };
    // Without this, a failing upstream would be called (and logged) once per visitor request.
    if (!this.#failedRecently(request)) this.#refreshInBackground(request);
    return { ...cached, origin: 'stale' };
  }

  /** For the scheduler, which cannot handle a rejection: every failure, the cache's too, is logged. */
  async refreshIfStale(request: DatasetRequest): Promise<void> {
    await this.#refreshUnlessFresh(request).catch((error: unknown) =>
      this.#recordFailure(request, error),
    );
  }

  async #refreshUnlessFresh(request: DatasetRequest): Promise<void> {
    const cached = this.#deps.cache.read(request.cacheKey);
    if (cached !== undefined && this.#isFresh(cached, request)) return;
    await this.#refresh(request);
  }

  #refreshInBackground(request: DatasetRequest): void {
    this.#refresh(request).catch((error: unknown) => this.#recordFailure(request, error));
  }

  #isFresh(cached: CachedDataset, request: DatasetRequest): boolean {
    return this.#deps.clock.now() - cached.fetchedAtMs < request.ttlMs;
  }

  async #fetchOrFallBack(request: DatasetRequest): Promise<ServedDataset> {
    if (this.#failedRecently(request)) return this.#snapshotOrThrow(request);
    return this.#fetchFresh(request).catch((error: unknown) =>
      this.#fallBackAfterFailure(request, error),
    );
  }

  async #fetchFresh(request: DatasetRequest): Promise<ServedDataset> {
    return { ...(await this.#refresh(request)), origin: 'fresh' };
  }

  #fallBackAfterFailure(request: DatasetRequest, error: unknown): Promise<ServedDataset> {
    this.#recordFailure(request, error);
    return this.#snapshotOrThrow(request);
  }

  async #snapshotOrThrow(request: DatasetRequest): Promise<ServedDataset> {
    const snapshot = await this.#deps.snapshots.read(request.snapshotName);
    if (snapshot === undefined) {
      throw new DatasetUnavailableError(
        `${request.cacheKey} is unavailable: upstream failed and there is no snapshot`,
      );
    }
    return { ...snapshot, origin: 'snapshot' };
  }

  /** Concurrent callers share one upstream request per cache key. */
  #refresh(request: DatasetRequest): Promise<CachedDataset> {
    const pending = this.#inFlight.get(request.cacheKey);
    if (pending !== undefined) return pending;
    const refresh = this.#fetchAndStore(request).finally(() =>
      this.#inFlight.delete(request.cacheKey),
    );
    this.#inFlight.set(request.cacheKey, refresh);
    return refresh;
  }

  async #fetchAndStore(request: DatasetRequest): Promise<CachedDataset> {
    const dataset = {
      dataJson: JSON.stringify(await request.fetchData()),
      fetchedAtMs: this.#deps.clock.now(),
    };
    this.#deps.cache.write(request.cacheKey, dataset);
    this.#lastFailureAtMs.delete(request.cacheKey);
    return dataset;
  }

  #failedRecently(request: DatasetRequest): boolean {
    const failedAtMs = this.#lastFailureAtMs.get(request.cacheKey);
    return failedAtMs !== undefined && this.#deps.clock.now() - failedAtMs < FAILURE_BACKOFF_MS;
  }

  #recordFailure(request: DatasetRequest, error: unknown): void {
    this.#lastFailureAtMs.set(request.cacheKey, this.#deps.clock.now());
    this.#deps.logger.warn({ cacheKey: request.cacheKey, err: error }, 'Dataset refresh failed');
  }
}
