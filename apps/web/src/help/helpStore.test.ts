import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage, throwingStorage } from '../test/fakeStorage';
import { HelpStore } from './helpStore';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HelpStore', () => {
  it('starts closed, with the hint not yet seen', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const store = new HelpStore();
    expect(store.isOpen).toBe(false);
    expect(store.hintSeen).toBe(false);
  });

  it('opens and closes, telling subscribers each time', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const store = new HelpStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.open();
    expect(store.isOpen).toBe(true);
    store.close();
    expect(store.isOpen).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stays quiet when nothing changes', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const store = new HelpStore();
    store.open();
    const listener = vi.fn();
    store.subscribe(listener);
    store.open();
    store.dismissHint();
    expect(listener).not.toHaveBeenCalled();
  });

  it('counts opening help as having seen the hint', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const store = new HelpStore();
    store.open();
    expect(store.hintSeen).toBe(true);
  });

  it('remembers a dismissed hint across a reload', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    new HelpStore().dismissHint();
    expect(new HelpStore().hintSeen).toBe(true);
  });

  it('remembers the hint as seen after help was opened, across a reload', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    new HelpStore().open();
    const after = new HelpStore();
    expect(after.hintSeen).toBe(true);
    expect(after.isOpen).toBe(false);
  });

  it('shows the hint and lets it be dismissed for the session when storage throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    const store = new HelpStore();
    expect(store.hintSeen).toBe(false);
    store.dismissHint();
    expect(store.hintSeen).toBe(true);
  });

  it('reads anything unexpected in storage as not seen', () => {
    const storage = memoryStorage();
    storage.setItem('perihelion.helpHintSeen', 'maybe');
    vi.stubGlobal('localStorage', storage);
    expect(new HelpStore().hintSeen).toBe(false);
  });
});
