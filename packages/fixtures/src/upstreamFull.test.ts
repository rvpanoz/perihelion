import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadFullSbdbNeoResponse } from './upstreamFull';

describe('loadFullSbdbNeoResponse', () => {
  it('returns the whole near-Earth asteroid catalogue', () => {
    const { data } = z.object({ data: z.array(z.unknown()) }).parse(loadFullSbdbNeoResponse());
    // Sanity floor, not a tolerance: ~40k NEAs were known when Phase 2 was planned.
    expect(data.length).toBeGreaterThan(30_000);
  });
});
