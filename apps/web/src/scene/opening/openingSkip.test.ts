import { describe, expect, it, vi } from 'vitest';
import { OPENING_SKIP_EVENTS, listenForSkip, openingOffInUrl } from './openingSkip';

describe('listenForSkip', () => {
  it.each(OPENING_SKIP_EVENTS)('skips on %s', (type) => {
    const target = new EventTarget();
    const onSkip = vi.fn();
    listenForSkip(target, onSkip);
    target.dispatchEvent(new Event(type));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('ignores other events', () => {
    const target = new EventTarget();
    const onSkip = vi.fn();
    listenForSkip(target, onSkip);
    target.dispatchEvent(new Event('pointermove'));
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('stops listening once unsubscribed', () => {
    const target = new EventTarget();
    const onSkip = vi.fn();
    listenForSkip(target, onSkip)();
    for (const type of OPENING_SKIP_EVENTS) target.dispatchEvent(new Event(type));
    expect(onSkip).not.toHaveBeenCalled();
  });
});

describe('openingOffInUrl', () => {
  it.each([
    ['?opening=off', true],
    ['?focus=earth&opening=off', true],
    ['?opening=on', false],
    ['', false],
  ])('reads %j as %s', (search, off) => {
    expect(openingOffInUrl(search)).toBe(off);
  });
});
