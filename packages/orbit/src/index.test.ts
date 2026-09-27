import { describe, expect, it } from 'vitest';
import { KM_PER_AU } from './index';

describe('KM_PER_AU', () => {
  it('matches the IAU 2012 definition of the astronomical unit', () => {
    expect(KM_PER_AU * 1000).toBe(149_597_870_700);
  });
});
