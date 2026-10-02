import { describe, expect, it } from 'vitest';
import { type DeviceHints, initialTier } from './initialTier';

const M3_RENDERER = 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)';

describe('initialTier', () => {
  it.each<[string, DeviceHints, string]>([
    ['a phone', { coarsePointer: true, shortSidePx: 390, gpuRenderer: 'Apple GPU' }, 'low'],
    [
      'an Intel laptop',
      {
        coarsePointer: false,
        shortSidePx: 1080,
        gpuRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      },
      'medium',
    ],
    [
      'an Android tablet',
      { coarsePointer: true, shortSidePx: 800, gpuRenderer: 'Adreno (TM) 740' },
      'medium',
    ],
    ['the M3', { coarsePointer: false, shortSidePx: 1080, gpuRenderer: M3_RENDERER }, 'high'],
    [
      'a browser that masks the renderer',
      { coarsePointer: false, shortSidePx: 1080, gpuRenderer: '' },
      'high',
    ],
  ])('starts %s on %s', (_, device, tierName) => {
    expect(initialTier(device)).toBe(tierName);
  });
});
