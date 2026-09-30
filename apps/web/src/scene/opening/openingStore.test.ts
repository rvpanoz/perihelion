import { describe, expect, it, vi } from 'vitest';
import { OpeningStore } from './openingStore';

describe('OpeningStore', () => {
  it('starts waiting', () => {
    expect(new OpeningStore().phase).toBe('waiting');
  });

  it('notifies once per change of phase, not on repeats', () => {
    const store = new OpeningStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setPhase('playing');
    store.setPhase('playing');
    store.setPhase('done');
    expect(store.phase).toBe('done');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', () => {
    const store = new OpeningStore();
    const listener = vi.fn();
    store.subscribe(listener)();
    store.setPhase('done');
    expect(listener).not.toHaveBeenCalled();
  });
});
