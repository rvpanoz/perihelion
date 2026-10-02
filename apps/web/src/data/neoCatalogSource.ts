import {
  type NeoCatalogMessage,
  type NeoCatalogRequest,
  loadNeoCatalogMessage,
} from './neoCatalogMessage';

export type DeliverNeoCatalog = (message: NeoCatalogMessage) => void;
export type StopLoading = () => void;

/** Starts loading the catalog; every message it produces goes to `deliver` until the returned stop is called. */
export type NeoCatalogSource = (
  request: NeoCatalogRequest,
  deliver: DeliverNeoCatalog,
) => StopLoading;

export interface CatalogWorkerHandlers {
  onMessage: DeliverNeoCatalog;
  /** The worker died or its message could not be read: it will post nothing more. */
  onFailure: () => void;
}

/** Throws when the browser can't start a module worker. */
export type StartCatalogWorker = (
  request: NeoCatalogRequest,
  handlers: CatalogWorkerHandlers,
) => StopLoading;

export interface NeoCatalogSourceDeps {
  startWorker: StartCatalogWorker;
  loadOnMainThread: (request: NeoCatalogRequest) => Promise<NeoCatalogMessage>;
}

/**
 * Parsing, validating and building the swarm cost ~60 ms of main-thread time for 42.5k NEOs, so they run in a
 * worker. Without one, or if it dies before posting, the same path runs on the main thread. A worker that reports
 * the catalog unavailable is believed: retrying here would only download the 4 MB again.
 */
export function createNeoCatalogSource(deps: NeoCatalogSourceDeps): NeoCatalogSource {
  return (request, deliver) => new CatalogLoad(deps, deliver).start(request);
}

class CatalogLoad {
  private stopped = false;
  private delivered = false;
  private stopWorker: StopLoading | undefined;

  constructor(
    private readonly deps: NeoCatalogSourceDeps,
    private readonly deliver: DeliverNeoCatalog,
  ) {}

  start(request: NeoCatalogRequest): StopLoading {
    this.stopWorker = this.workerOrUndefined(request);
    if (this.stopWorker === undefined) this.loadOnMainThread(request);
    return () => {
      this.stopped = true;
      this.stopWorker?.();
    };
  }

  private workerOrUndefined(request: NeoCatalogRequest): StopLoading | undefined {
    const handlers = {
      onMessage: this.accept,
      onFailure: () => this.fallBack(request),
    };
    try {
      return this.deps.startWorker(request, handlers);
    } catch (error) {
      console.warn('No module worker; loading the NEO catalog on the main thread', error);
      return undefined;
    }
  }

  private fallBack(request: NeoCatalogRequest): void {
    this.stopWorker?.();
    if (!this.delivered && !this.stopped) this.loadOnMainThread(request);
  }

  private loadOnMainThread(request: NeoCatalogRequest): void {
    void this.deps.loadOnMainThread(request).then(this.accept);
  }

  private readonly accept = (message: NeoCatalogMessage): void => {
    if (this.stopped) return;
    this.delivered = true;
    this.deliver(message);
  };
}

/** Vite bundles the worker from this `new URL(..., import.meta.url)` form; no plugin or dependency is needed. */
export const startBrowserCatalogWorker: StartCatalogWorker = (request, handlers) => {
  const worker = new Worker(new URL('./neoCatalogWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<NeoCatalogMessage>) => handlers.onMessage(event.data);
  worker.onerror = (event) => {
    event.preventDefault();
    handlers.onFailure();
  };
  worker.onmessageerror = () => handlers.onFailure();
  worker.postMessage(request);
  return () => worker.terminate();
};

export const BROWSER_NEO_CATALOG_SOURCE = createNeoCatalogSource({
  startWorker: startBrowserCatalogWorker,
  loadOnMainThread: async (request) => (await loadNeoCatalogMessage(request)).message,
});
