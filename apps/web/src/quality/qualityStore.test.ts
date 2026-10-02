import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage, throwingStorage } from '../test/fakeStorage';
import { QualityStore } from './qualityStore';
import { GOVERNOR_SETTINGS } from './tierGovernor';

const { warmUpMs, windowMs } = GOVERNOR_SETTINGS;

/** Frames of one length for a duration, as `QualityGovernor` passes them on. */
function feed(store: QualityStore, frame: { ms: number; forMs: number }): void {
  for (let elapsedMs = 0; elapsedMs < frame.forMs; elapsedMs += frame.ms)
    store.recordFrame(frame.ms);
}

/** Past the warm-up and two slow windows, with margin for frames that straddle a window: one drop. */
function slowFramesForOneDrop(store: QualityStore): void {
  feed(store, { ms: 30, forMs: warmUpMs + windowMs * 2.5 });
}

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

describe('QualityStore preference', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts on Auto and waits for the first guess before judging frames', () => {
    const store = new QualityStore();
    expect(store.preference).toBe('auto');
    slowFramesForOneDrop(store);
    expect(store.tierName).toBe('high');
    store.applyFirstGuess('medium');
    expect(store.tierName).toBe('medium');
    slowFramesForOneDrop(store);
    expect(store.tierName).toBe('low');
  });

  it('stops the governor on a manual tier', () => {
    const store = new QualityStore();
    store.applyFirstGuess('high');
    store.setPreference('low');
    expect(store.tierName).toBe('low');
    store.applyFirstGuess('high');
    feed(store, { ms: 13, forMs: 200_000 });
    expect(store.tierName).toBe('low');
  });

  it('restarts Auto from the tier on screen with a fresh warm-up', () => {
    const store = new QualityStore();
    store.applyFirstGuess('high');
    feed(store, { ms: 30, forMs: warmUpMs + windowMs });
    store.setPreference('medium');
    store.setPreference('auto');
    expect(store.tierName).toBe('medium');
    feed(store, { ms: 30, forMs: warmUpMs + windowMs });
    expect(store.tierName).toBe('medium');
    feed(store, { ms: 30, forMs: windowMs });
    expect(store.tierName).toBe('low');
  });

  it('keeps the preference and the trails choice across a reload', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const before = new QualityStore();
    before.setPreference('medium');
    before.setTrailsPreference(false);
    const after = new QualityStore();
    expect(after.preference).toBe('medium');
    expect(after.tierName).toBe('medium');
    expect(after.showTrails).toBe(false);
  });

  it('works for the session when storage throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    const store = new QualityStore();
    store.setPreference('low');
    store.setTrailsPreference(true);
    expect(store.tierName).toBe('low');
    expect(store.showTrails).toBe(true);
  });

  it('reads anything unexpected in storage as Auto and the tier default', () => {
    const storage = memoryStorage();
    storage.setItem('perihelion.quality', 'ultra');
    storage.setItem('perihelion.trails', 'maybe');
    vi.stubGlobal('localStorage', storage);
    const store = new QualityStore();
    expect(store.preference).toBe('auto');
    expect(store.showTrails).toBe(true);
  });

  it('holds a tier for this load only without storing it', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    new QualityStore().setPreferenceForThisLoad('low');
    expect(storage.getItem('perihelion.quality')).toBeNull();
    const store = new QualityStore();
    store.setPreferenceForThisLoad('low');
    expect(store.tierName).toBe('low');
    expect(store.preference).toBe('low');
  });

  it('forgets the frames of a window cut short by a hidden tab', () => {
    const store = new QualityStore();
    store.applyFirstGuess('high');
    feed(store, { ms: 30, forMs: warmUpMs + windowMs * 1.5 });
    store.discardFrameWindow();
    feed(store, { ms: 30, forMs: windowMs * 0.75 });
    expect(store.tierName).toBe('high');
  });

  it('notifies when the preference changes', () => {
    const store = new QualityStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setPreference('auto');
    store.setPreference('high');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
