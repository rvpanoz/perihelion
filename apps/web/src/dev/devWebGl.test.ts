import { describe, expect, it } from 'vitest';
import { webGlForcedOffFromUrl } from './devWebGl';

describe('webGlForcedOffFromUrl', () => {
  it.each([
    ['?webgl=off', true],
    ['?bench=overview&webgl=off', true],
    ['?webgl=on', false],
    ['', false],
  ])('%s → %s', (search, expected) => {
    expect(webGlForcedOffFromUrl(search)).toBe(expected);
  });
});
