import { Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { EARTH_LOOK } from './earthLook';
import { EarthDayMapStore } from './earthDayMap';

type OnLoad = (texture: Texture) => void;

describe('EarthDayMapStore', () => {
  it('loads the map once, marks it sRGB and notifies', () => {
    const store = new EarthDayMapStore();
    const listener = vi.fn();
    store.subscribe(listener);
    let finish: OnLoad = () => undefined;
    const load = vi.fn((url: string, onLoad: OnLoad) => {
      expect(url).toBe(EARTH_LOOK.dayTextureUrl);
      finish = onLoad;
      return new Texture();
    });
    store.load({ load } as never);
    store.load({ load } as never);
    expect(load).toHaveBeenCalledOnce();
    const texture = new Texture();
    finish(texture);
    expect(store.map).toBe(texture);
    expect(texture.colorSpace).toBe('srgb');
    expect(listener).toHaveBeenCalledOnce();
  });
});
