import { describe, expect, it } from 'vitest';
import { percentileMs } from './frameStats';

describe('percentileMs', () => {
  it('uses the nearest rank', () => {
    const values = Array.from({ length: 10 }, (_, index) => index + 1);
    expect(percentileMs(values, 0.9)).toBe(9);
    expect(percentileMs(values, 1)).toBe(10);
  });

  it('is 0 for no frames', () => {
    expect(percentileMs([], 0.9)).toBe(0);
  });
});
