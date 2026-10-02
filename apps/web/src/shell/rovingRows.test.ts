import { describe, expect, it } from 'vitest';
import { nextRowIndex, tabStopKey } from './rovingRows';

describe('nextRowIndex', () => {
  it.each([
    ['ArrowDown', 1, 2],
    ['ArrowUp', 1, 0],
    ['Home', 2, 0],
    ['End', 0, 3],
  ])('moves on %s from row %i to row %i', (key, index, expected) => {
    expect(nextRowIndex(key, { index, count: 4 })).toBe(expected);
  });

  it('stops at both ends rather than wrapping', () => {
    expect(nextRowIndex('ArrowDown', { index: 3, count: 4 })).toBe(3);
    expect(nextRowIndex('ArrowUp', { index: 0, count: 4 })).toBe(0);
  });

  it('ignores other keys, and focus outside the rows', () => {
    expect(nextRowIndex('Enter', { index: 1, count: 4 })).toBeUndefined();
    expect(nextRowIndex('ArrowDown', { index: -1, count: 4 })).toBeUndefined();
  });
});

describe('tabStopKey', () => {
  const keys = ['a', 'b', 'c'];

  it('is the row the viewer last focused', () => {
    expect(tabStopKey({ keys, focusedKey: 'c', selectedKey: 'b' })).toBe('c');
  });

  it('falls back to the selected row, then the first, when the focused row is gone', () => {
    expect(tabStopKey({ keys, focusedKey: 'gone', selectedKey: 'b' })).toBe('b');
    expect(tabStopKey({ keys, focusedKey: undefined, selectedKey: 'gone' })).toBe('a');
  });

  it('is undefined for an empty list', () => {
    expect(tabStopKey({ keys: [], focusedKey: 'a', selectedKey: 'a' })).toBeUndefined();
  });
});
