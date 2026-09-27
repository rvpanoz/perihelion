import { describe, expect, it } from 'vitest';
import { HORIZONS_API_URL } from './index';

describe('HORIZONS_API_URL', () => {
  it('points at the JPL SSD Horizons API over HTTPS', () => {
    const url = new URL(HORIZONS_API_URL);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('ssd.jpl.nasa.gov');
  });
});
