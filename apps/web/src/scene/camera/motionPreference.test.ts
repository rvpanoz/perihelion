import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './motionPreference';

function stubReducedMotion(matches: boolean) {
  const matchMedia = vi.fn((query: string) => ({ matches: matches && query.includes('reduce') }));
  vi.stubGlobal('matchMedia', matchMedia);
}

describe('prefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false where there is no matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reads the setting on every call, so a change applies at once', () => {
    stubReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    stubReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });
});
