import { describe, expect, it, vi } from 'vitest';
import { QualityStore } from './qualityStore';

describe('QualityStore', () => {
  it('starts at High with the tier default for trails', () => {
    const store = new QualityStore();
    expect(store.tierName).toBe('high');
    expect(store.showTrails).toBe(true);
  });

  it("follows the tier's trail default until the viewer chooses", () => {
    const store = new QualityStore();
    store.setTierName('low');
    expect(store.showTrails).toBe(false);
    store.setTrailsPreference(true);
    store.setTierName('medium');
    store.setTierName('low');
    expect(store.showTrails).toBe(true);
  });

  it('notifies on real changes only', () => {
    const store = new QualityStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setTierName('high');
    store.setTierName('medium');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
