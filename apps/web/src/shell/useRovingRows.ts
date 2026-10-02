import { type FocusEvent, type KeyboardEvent, useState } from 'react';
import { nextRowIndex } from './rovingRows';

/** Rows mark themselves with this attribute; its value is the row's key. */
export const ROW_KEY_ATTRIBUTE = 'data-row-key';

export interface RovingRows {
  focusedKey: string | undefined;
  /** Spread onto the list's container: focus and key events bubble up from the rows. */
  containerProps: {
    onFocus: (event: FocusEvent<HTMLElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  };
}

/** React state is fine here: it changes only when the viewer moves focus. */
export function useRovingRows(): RovingRows {
  const [focusedKey, setFocusedKey] = useState<string>();
  return {
    focusedKey,
    containerProps: {
      onFocus: (event) => setFocusedKey(rowKeyOf(event.target) ?? focusedKey),
      onKeyDown: moveRowFocus,
    },
  };
}

function moveRowFocus(event: KeyboardEvent<HTMLElement>): void {
  const rows = [...event.currentTarget.querySelectorAll<HTMLElement>(`[${ROW_KEY_ATTRIBUTE}]`)];
  const index = event.target instanceof HTMLElement ? rows.indexOf(event.target) : -1;
  const next = nextRowIndex(event.key, { index, count: rows.length });
  if (next === undefined) return;
  event.preventDefault();
  rows[next]?.focus();
}

function rowKeyOf(target: EventTarget): string | undefined {
  if (!(target instanceof HTMLElement)) return undefined;
  return target.getAttribute(ROW_KEY_ATTRIBUTE) ?? undefined;
}
