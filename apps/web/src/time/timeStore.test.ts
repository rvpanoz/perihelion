import { describe, expect, it, vi } from 'vitest';
import { TIME_RANGE_JD_TDB } from './timeController';
import { TimeStore } from './timeStore';

const J2000_JD_TDB = 2_451_545;

function createStore(nowUnixMs = () => Date.UTC(2026, 8, 29)) {
  return new TimeStore({
    initial: { jdTdb: J2000_JD_TDB, rateDaysPerSecond: 1, playing: true },
    nowUnixMs,
  });
}

describe('TimeStore', () => {
  it('advances on tick without notifying (the frame loop never wakes React)', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.tick(0.05);
    expect(store.state.jdTdb).toBeCloseTo(J2000_JD_TDB + 0.05, 12);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies on every user action', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setPlaying(false);
    store.setRate(10);
    store.scrubTo(J2000_JD_TDB + 100);
    store.jumpToNow();
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('changes a scripted rate without notifying, clamped like any other', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setScriptedRate(30);
    expect(store.state.rateDaysPerSecond).toBe(30);
    store.setScriptedRate(-5);
    expect(store.state.rateDaysPerSecond).toBe(1 / 86_400);
    expect(listener).not.toHaveBeenCalled();
  });

  it('clamps scrubbing and rates', () => {
    const store = createStore();
    store.scrubTo(0);
    store.setRate(-5);
    expect(store.state.jdTdb).toBe(TIME_RANGE_JD_TDB.startJdTdb);
    expect(store.state.rateDaysPerSecond).toBe(1 / 86_400);
  });

  it('jumps to now from the injected clock, clamped to 2050', () => {
    const store = createStore(() => Date.UTC(2017, 0, 1));
    store.jumpToNow();
    expect(store.state.jdTdb).toBeCloseTo(2_457_754.5 + 69.184 / 86_400, 9);
    const future = createStore(() => Date.UTC(2080, 0, 1));
    future.jumpToNow();
    expect(future.state.jdTdb).toBe(TIME_RANGE_JD_TDB.endJdTdb);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setPlaying(false);
    expect(listener).not.toHaveBeenCalled();
  });
});
