import { describe, expect, it, vi } from 'vitest';
import { SelectionStore } from './selectionStore';

/** Only identity matters to the store, so a bare object stands in for a row. */
const APPROACH = { designation: '2026 RX7' };

describe('SelectionStore', () => {
  it('stores the selected row itself and notifies once', () => {
    const selection = new SelectionStore<typeof APPROACH>();
    const listener = vi.fn();
    selection.subscribe(listener);
    selection.select(APPROACH);
    expect(selection.selected).toBe(APPROACH);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('empties on clear and notifies', () => {
    const selection = new SelectionStore<typeof APPROACH>();
    selection.select(APPROACH);
    const listener = vi.fn();
    selection.subscribe(listener);
    selection.clear();
    expect(selection.selected).toBeUndefined();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('stops calling a listener once it unsubscribes', () => {
    const selection = new SelectionStore<typeof APPROACH>();
    const listener = vi.fn();
    const unsubscribe = selection.subscribe(listener);
    unsubscribe();
    selection.select(APPROACH);
    expect(listener).not.toHaveBeenCalled();
  });

  describe('reselectFrom (a data swap)', () => {
    const keyOf = (row: typeof APPROACH) => row.designation;

    it('points at the same row in the new list, so the list can still match it by identity', () => {
      const selection = new SelectionStore<typeof APPROACH>();
      selection.select(APPROACH);
      const swapped = { designation: '2026 RX7' };
      expect(selection.reselectFrom([{ designation: '2026 QA1' }, swapped], keyOf)).toBe(true);
      expect(selection.selected).toBe(swapped);
    });

    it('reports a row the new list no longer has, and leaves clearing to the caller', () => {
      const selection = new SelectionStore<typeof APPROACH>();
      selection.select(APPROACH);
      expect(selection.reselectFrom([{ designation: '2026 QA1' }], keyOf)).toBe(false);
      expect(selection.selected).toBe(APPROACH);
    });

    it('has nothing to keep, and does not notify, with nothing selected', () => {
      const selection = new SelectionStore<typeof APPROACH>();
      const listener = vi.fn();
      selection.subscribe(listener);
      expect(selection.reselectFrom([APPROACH], keyOf)).toBe(true);
      expect(selection.selected).toBeUndefined();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
