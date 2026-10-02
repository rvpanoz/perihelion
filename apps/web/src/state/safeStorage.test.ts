import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage, throwingStorage } from '../test/fakeStorage';
import { readStored, writeStored } from './safeStorage';

describe('safeStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads back what it wrote', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    writeStored('perihelion.test', 'medium');
    expect(readStored('perihelion.test')).toBe('medium');
  });

  it('reads a missing key as undefined', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(readStored('perihelion.test')).toBeUndefined();
  });

  it('gives undefined and never throws when storage throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(() => writeStored('perihelion.test', 'low')).not.toThrow();
    expect(readStored('perihelion.test')).toBeUndefined();
  });

  it('gives undefined where there is no storage at all', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => writeStored('perihelion.test', 'low')).not.toThrow();
    expect(readStored('perihelion.test')).toBeUndefined();
  });
});
