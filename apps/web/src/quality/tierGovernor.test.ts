import { describe, expect, it } from 'vitest';
import { GOVERNOR_SETTINGS, TierGovernor } from './tierGovernor';

/** Feeds frames of one length for a duration; returns the tiers the governor moved to, in order. */
function feed(governor: TierGovernor, frame: { ms: number; forMs: number }): string[] {
  const moves: string[] = [];
  for (let elapsedMs = 0; elapsedMs < frame.forMs; elapsedMs += frame.ms) {
    if (governor.recordFrame(frame.ms)) moves.push(governor.tier);
  }
  return moves;
}

const { warmUpMs, windowMs, steadyMsBeforeProbe } = GOVERNOR_SETTINGS;

describe('TierGovernor', () => {
  it('ignores slow frames while warming up', () => {
    const governor = new TierGovernor('high');
    expect(feed(governor, { ms: 40, forMs: warmUpMs })).toEqual([]);
  });

  it('drops one tier after two slow windows, not one', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    expect(feed(governor, { ms: 30, forMs: windowMs })).toEqual([]);
    expect(feed(governor, { ms: 30, forMs: windowMs })).toEqual(['medium']);
  });

  it('holds a 60 Hz display at its vsync cap', () => {
    const governor = new TierGovernor('high');
    expect(feed(governor, { ms: 16.9, forMs: 30_000 })).toEqual([]);
  });

  it('judges the 90th percentile, so rare spikes do not drop a tier', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    const moves: string[] = [];
    for (let frame = 0; frame < 1_000; frame += 1) {
      if (governor.recordFrame(frame % 20 === 0 ? 45 : 13)) moves.push(governor.tier);
    }
    expect(moves).toEqual([]);
  });

  it('ignores frames over 250 ms, such as the first after a hidden tab', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    expect(feed(governor, { ms: 3_000, forMs: 12_000 })).toEqual([]);
  });

  it('forgets a discarded window', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    // One slow window closes, then half of a second one is discarded; without the discard, the next
    // 1.5 s of slow frames would close that second slow window and drop the tier.
    feed(governor, { ms: 30, forMs: windowMs * 1.5 });
    governor.discardWindow();
    expect(feed(governor, { ms: 30, forMs: windowMs * 0.75 })).toEqual([]);
  });

  it('never goes below Low', () => {
    const governor = new TierGovernor('low');
    expect(feed(governor, { ms: 40, forMs: 20_000 })).toEqual([]);
  });

  it('probes one tier up after a steady minute', () => {
    const governor = new TierGovernor('medium');
    expect(feed(governor, { ms: 13, forMs: warmUpMs + steadyMsBeforeProbe + windowMs })).toEqual([
      'high',
    ]);
  });

  it('locks after a failed probe', () => {
    const governor = new TierGovernor('medium');
    feed(governor, { ms: 13, forMs: warmUpMs + steadyMsBeforeProbe + windowMs });
    expect(feed(governor, { ms: 30, forMs: warmUpMs + windowMs * 2 })).toEqual(['medium']);
    expect(feed(governor, { ms: 13, forMs: steadyMsBeforeProbe * 3 })).toEqual([]);
  });

  it('warms up again after every change', () => {
    const governor = new TierGovernor('high');
    feed(governor, { ms: 13, forMs: warmUpMs });
    feed(governor, { ms: 30, forMs: windowMs * 2 });
    expect(feed(governor, { ms: 30, forMs: warmUpMs })).toEqual([]);
  });
});
