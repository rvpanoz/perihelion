import { describe, expect, it, vi } from 'vitest';
import type { NeoCatalogMessage, NeoCatalogRequest } from './neoCatalogMessage';
import {
  type CatalogWorkerHandlers,
  type NeoCatalogSourceDeps,
  createNeoCatalogSource,
} from './neoCatalogSource';

const REQUEST: NeoCatalogRequest = { referenceJdTdb: 2_461_313.5 };
const UNAVAILABLE: NeoCatalogMessage = { kind: 'unavailable' };
/** A separate object, so `toBe` tells which path delivered it. */
const FROM_MAIN_THREAD: NeoCatalogMessage = { kind: 'unavailable' };

/** A worker the test drives by hand: it records its handlers, so the test can reply or fail. */
function fakeWorker() {
  const worker = { handlers: undefined as CatalogWorkerHandlers | undefined, stop: vi.fn() };
  const startWorker = vi.fn((_request: NeoCatalogRequest, handlers: CatalogWorkerHandlers) => {
    worker.handlers = handlers;
    return worker.stop;
  });
  return { worker, startWorker };
}

function depsWith(startWorker: NeoCatalogSourceDeps['startWorker']) {
  const loadOnMainThread = vi.fn(() => Promise.resolve(FROM_MAIN_THREAD));
  return { startWorker, loadOnMainThread };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createNeoCatalogSource', () => {
  it('loads in the worker and delivers what it posts', () => {
    const { worker, startWorker } = fakeWorker();
    const deps = depsWith(startWorker);
    const deliver = vi.fn();
    createNeoCatalogSource(deps)(REQUEST, deliver);
    worker.handlers?.onMessage(UNAVAILABLE);
    expect(startWorker).toHaveBeenCalledWith(REQUEST, expect.anything());
    expect(deliver.mock.calls[0]?.[0]).toBe(UNAVAILABLE);
    expect(deps.loadOnMainThread).not.toHaveBeenCalled();
  });

  it('loads on the main thread when the browser has no module workers', async () => {
    const deps = depsWith(() => {
      throw new Error('Worker is not defined');
    });
    const deliver = vi.fn();
    createNeoCatalogSource(deps)(REQUEST, deliver);
    await settle();
    expect(deps.loadOnMainThread).toHaveBeenCalledWith(REQUEST);
    expect(deliver.mock.calls[0]?.[0]).toBe(FROM_MAIN_THREAD);
  });

  it('falls back to the main thread when the worker fails before posting', async () => {
    const { worker, startWorker } = fakeWorker();
    const deps = depsWith(startWorker);
    const deliver = vi.fn();
    createNeoCatalogSource(deps)(REQUEST, deliver);
    worker.handlers?.onFailure();
    await settle();
    expect(worker.stop).toHaveBeenCalled();
    expect(deliver.mock.calls[0]?.[0]).toBe(FROM_MAIN_THREAD);
  });

  it('keeps what the worker posted when it fails afterwards', async () => {
    const { worker, startWorker } = fakeWorker();
    const deps = depsWith(startWorker);
    createNeoCatalogSource(deps)(REQUEST, vi.fn());
    worker.handlers?.onMessage(UNAVAILABLE);
    worker.handlers?.onFailure();
    await settle();
    expect(deps.loadOnMainThread).not.toHaveBeenCalled();
  });

  it('delivers nothing once stopped, and stops the worker', async () => {
    const deps = depsWith(() => {
      throw new Error('Worker is not defined');
    });
    const deliver = vi.fn();
    const stop = createNeoCatalogSource(deps)(REQUEST, deliver);
    stop();
    await settle();
    expect(deliver).not.toHaveBeenCalled();

    const { worker, startWorker } = fakeWorker();
    createNeoCatalogSource(depsWith(startWorker))(REQUEST, deliver)();
    worker.handlers?.onMessage(UNAVAILABLE);
    expect(worker.stop).toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });
});
