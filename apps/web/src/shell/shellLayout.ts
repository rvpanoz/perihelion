/** Kept in step with the media queries of the same layouts in `styles.css`. */
export const WIDE_LAYOUT_QUERY = '(min-width: 1100px)';

/**
 * A phone held either way. Sideways (e.g. 852 × 393) it is wide enough for the drawers, but the drawers and a
 * stacked time bar would leave almost no scene, so short screens get the sheets too.
 */
export const SHEETS_LAYOUT_QUERY =
  '(max-width: 599.98px), (max-height: 500px) and (max-width: 1099.98px)';

export type ShellLayout = 'wide' | 'drawers' | 'sheets';

export function shellLayoutFor(matches: (query: string) => boolean): ShellLayout {
  if (matches(WIDE_LAYOUT_QUERY)) return 'wide';
  if (matches(SHEETS_LAYOUT_QUERY)) return 'sheets';
  return 'drawers';
}

export interface ColumnDetailsProps {
  open: boolean;
  name?: string;
}

/**
 * Sheets share one `<details name>` group, so the browser keeps at most one open. Only the sheets: both wide columns
 * start open, and a shared name would close one of them.
 */
export function columnDetailsProps(layout: ShellLayout): ColumnDetailsProps {
  if (layout === 'wide') return { open: true };
  if (layout === 'sheets') return { open: false, name: 'shell-sheet' };
  return { open: false };
}
