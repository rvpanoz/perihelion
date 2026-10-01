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
});
