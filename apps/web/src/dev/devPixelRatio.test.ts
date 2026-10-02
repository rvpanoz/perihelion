import { describe, expect, it } from 'vitest';
import { devPixelRatioFromUrl } from './devPixelRatio';

describe('devPixelRatioFromUrl', () => {
  it.each([
    ['?dpr=2', 2],
    ['?dpr=1.5', 1.5],
    ['?bench=earth&dpr=1', 1],
  ])('reads %s as %d', (search, pixelRatio) => {
    expect(devPixelRatioFromUrl(search)).toBe(pixelRatio);
  });

  it.each([
    ['?dpr=0.1', 0.5],
    ['?dpr=8', 3],
  ])('clamps %s to %d', (search, pixelRatio) => {
    expect(devPixelRatioFromUrl(search)).toBe(pixelRatio);
  });

  it.each(['', '?dpr=', '?dpr=high', '?dpr=0', '?dpr=-1'])(
    'leaves the pixel ratio alone for %j',
    (search) => {
      expect(devPixelRatioFromUrl(search)).toBeUndefined();
    },
  );
});
