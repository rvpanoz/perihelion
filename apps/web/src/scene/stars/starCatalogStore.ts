import { useSyncExternalStore } from 'react';
import { type StarCatalog, unpackStars } from './starPacking';

/** Written by `npm run stars` and committed; ~67 KB, fetched after first paint like the Earth map. */
export const STAR_CATALOG_URL = '/stars/bsc5p-v1.bin';

/**
 * The star catalog, loaded once by `SceneCanvas` (it needs the browser), never by the scene itself, so the scene
 * renders in tests and the sky stays empty until the file arrives: one React commit, not one per frame.
 */
export class StarCatalogStore {
  #catalog: StarCatalog | undefined;
  #loading = false;
  readonly #listeners = new Set<() => void>();

  get catalog(): StarCatalog | undefined {
    return this.#catalog;
  }

  /** Loads at most once. The sky is decoration, so a failure leaves it empty and is only logged. */
  load = async (fetchCatalog: typeof fetch = fetch): Promise<void> => {
    if (this.#loading) return;
    this.#loading = true;
    try {
      this.#receive(await fetchStarBytes(fetchCatalog));
    } catch (error) {
      console.warn('Star catalog unavailable; drawing an empty sky', error);
    }
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #receive = (bytes: ArrayBuffer): void => {
    this.#catalog = unpackStars(bytes);
    for (const listener of this.#listeners) listener();
  };
}

async function fetchStarBytes(fetchCatalog: typeof fetch): Promise<ArrayBuffer> {
  const response = await fetchCatalog(STAR_CATALOG_URL);
  if (!response.ok) {
    throw new Error(`Star catalog answered ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}

export const starCatalog = new StarCatalogStore();

export function useStarCatalog(): StarCatalog | undefined {
  return useSyncExternalStore(starCatalog.subscribe, () => starCatalog.catalog);
}
