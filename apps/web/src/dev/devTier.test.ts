import { describe, expect, it } from 'vitest';
import { devTierNameFromUrl } from './devTier';

describe('devTierNameFromUrl', () => {
  it.each([
    ['?tier=low', 'low'],
    ['?tier=medium', 'medium'],
    ['?bench=sun&tier=high', 'high'],
  ] as const)('reads %s as %s', (search, tierName) => {
    expect(devTierNameFromUrl(search)).toBe(tierName);
  });

  it.each(['', '?tier=', '?tier=ultra', '?tier=LOW', '?tier=toString'])(
    'leaves the tier alone for %j',
    (search) => {
      expect(devTierNameFromUrl(search)).toBeUndefined();
    },
  );
});
