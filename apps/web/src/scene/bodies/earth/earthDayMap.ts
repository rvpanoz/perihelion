import { useSyncExternalStore } from 'react';
import { SRGBColorSpace, type Texture, TextureLoader } from 'three';
import { EARTH_LOOK } from './earthLook';

/**
 * The day map, loaded once by `SceneCanvas` (it needs the browser), never by the scene itself, so the scene renders
 * in tests and draws Earth as a plain sphere until the map arrives: one React commit, not one per frame.
 */
export class EarthDayMapStore {
  #map: Texture | undefined;
  #loading = false;
  readonly #listeners = new Set<() => void>();

  get map(): Texture | undefined {
    return this.#map;
  }

  /** Loads at most once; a failure leaves the plain sphere and is only logged. */
  load = (loader: Pick<TextureLoader, 'load'> = new TextureLoader()): void => {
    if (this.#loading) return;
    this.#loading = true;
    loader.load(EARTH_LOOK.dayTextureUrl, this.#receive, undefined, (error) =>
      console.warn('Earth day map unavailable; drawing a plain sphere', error),
    );
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  /** The map holds sRGB colours; three decodes them to linear on sampling once it knows. */
  #receive = (texture: Texture): void => {
    texture.colorSpace = SRGBColorSpace;
    this.#map = texture;
    for (const listener of this.#listeners) listener();
  };
}

export const earthDayMap = new EarthDayMapStore();

export function useEarthDayMap(): Texture | undefined {
  return useSyncExternalStore(earthDayMap.subscribe, () => earthDayMap.map);
}
