import { describe, expect, it } from 'vitest';
import { openingCaptionText } from './openingCaptionText';

describe('openingCaptionText', () => {
  it('gives the count and source, and labels the look illustrative', () => {
    expect(openingCaptionText(40_123)).toBe(
      'Orbits of 40,123 near-Earth asteroids from JPL SBDB · Colours, sizes and trails are illustrative',
    );
  });
});
