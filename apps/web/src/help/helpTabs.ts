import type { RowPosition } from '../shell/rovingRows';

/**
 * The WAI-ARIA APG tabs pattern: one Tab stop for the tab list, Left and Right move between tabs and wrap round,
 * Home and End jump to the ends. Unlike a long list's rows, five tabs are a short loop, so wrapping costs nothing.
 */
export function nextTabIndex(key: string, { index, count }: RowPosition): number | undefined {
  if (count === 0) return undefined;
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return undefined;
}
