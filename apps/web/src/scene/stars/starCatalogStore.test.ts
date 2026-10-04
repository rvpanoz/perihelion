import { describe, expect, it, vi } from 'vitest';
import { STAR_CATALOG_URL, StarCatalogStore } from './starCatalogStore';
import { packStars } from './starPacking';

const PACKED = packStars([{ raDeg: 101.2871, decDeg: -16.7161, vmag: -1.46, bvColor: 0 }]);

function answerWith(body: ArrayBuffer | undefined) {
  return vi.fn(async (url: string) => {
    expect(url).toBe(STAR_CATALOG_URL);
    if (!body) return { ok: false, status: 404, statusText: 'Not Found' };
    return { ok: true, status: 200, statusText: 'OK', arrayBuffer: async () => body };
  });
}

describe('StarCatalogStore', () => {
  it('fetches the catalog once and notifies when it lands', async () => {
    const store = new StarCatalogStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const fetchStars = answerWith(PACKED.buffer as ArrayBuffer);
    await store.load(fetchStars as never);
    await store.load(fetchStars as never);
    expect(fetchStars).toHaveBeenCalledOnce();
    expect(store.catalog?.count).toBe(1);
    expect(listener).toHaveBeenCalledOnce();
  });

  // The sky is decoration: a visitor who cannot have it gets the scene as it was before, not an error.
  it('leaves the sky empty when the catalog cannot be fetched', async () => {
    const store = new StarCatalogStore();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await store.load(answerWith(undefined) as never);
    expect(store.catalog).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('leaves the sky empty when the file is not a star catalog', async () => {
    const store = new StarCatalogStore();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await store.load(answerWith(new ArrayBuffer(16)) as never);
    expect(store.catalog).toBeUndefined();
    warn.mockRestore();
  });
});
