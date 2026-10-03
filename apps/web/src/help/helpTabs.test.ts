import { describe, expect, it } from 'vitest';
import { nextTabIndex } from './helpTabs';

const FIVE_TABS = { index: 2, count: 5 };

describe('nextTabIndex', () => {
  it('moves one tab with the left and right arrows', () => {
    expect(nextTabIndex('ArrowRight', FIVE_TABS)).toBe(3);
    expect(nextTabIndex('ArrowLeft', FIVE_TABS)).toBe(1);
  });

  it('wraps round at both ends', () => {
    expect(nextTabIndex('ArrowRight', { index: 4, count: 5 })).toBe(0);
    expect(nextTabIndex('ArrowLeft', { index: 0, count: 5 })).toBe(4);
  });

  it('jumps to the first and last tab with Home and End', () => {
    expect(nextTabIndex('Home', FIVE_TABS)).toBe(0);
    expect(nextTabIndex('End', FIVE_TABS)).toBe(4);
  });

  it('leaves other keys alone, Up and Down included', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'a']) {
      expect(nextTabIndex(key, FIVE_TABS)).toBeUndefined();
    }
  });

  it('does nothing without tabs', () => {
    expect(nextTabIndex('ArrowRight', { index: 0, count: 0 })).toBeUndefined();
  });
});
