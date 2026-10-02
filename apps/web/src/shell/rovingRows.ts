/**
 * One Tab stop per list, arrows inside it (the WAI-ARIA APG "roving tabindex" pattern), so reaching the card after
 * picking a row takes one Tab rather than one per remaining row.
 */

export interface RowPosition {
  /** The focused row's index; −1 when focus is elsewhere in the list. */
  index: number;
  count: number;
}

export interface TabStopInput {
  /** The rows' keys in display order. */
  keys: readonly string[];
  focusedKey: string | undefined;
  selectedKey: string | undefined;
}

/** Stops at the ends rather than wrapping, so holding an arrow key does not cycle through the list. */
export function nextRowIndex(key: string, { index, count }: RowPosition): number | undefined {
  if (index < 0 || count === 0) return undefined;
  if (key === 'ArrowDown') return Math.min(index + 1, count - 1);
  if (key === 'ArrowUp') return Math.max(index - 1, 0);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return undefined;
}

/** The last focused row while it is still listed (a data swap can remove it), else the selected row, else the first. */
export function tabStopKey({ keys, focusedKey, selectedKey }: TabStopInput): string | undefined {
  if (focusedKey !== undefined && keys.includes(focusedKey)) return focusedKey;
  if (selectedKey !== undefined && keys.includes(selectedKey)) return selectedKey;
  return keys[0];
}
