import { type ReactNode, useSyncExternalStore } from 'react';
import {
  columnDetailsProps,
  SHEETS_LAYOUT_QUERY,
  type ShellLayout,
  shellLayoutFor,
  WIDE_LAYOUT_QUERY,
} from './shellLayout';

export interface ShellColumnProps {
  side: 'left' | 'right';
  label: string;
  children: ReactNode;
}

/**
 * Wide screens show the column open with its summary hidden; narrower ones get a closed drawer, and phones a sheet
 * that closes the other. Remounting on the layout (the key) resets the open state, so a drawer closed on a phone is
 * not left shut on a desktop.
 */
export function ShellColumn({ side, label, children }: ShellColumnProps) {
  const layout = useSyncExternalStore(subscribeToLayout, currentLayout, (): ShellLayout => 'wide');
  return (
    <details
      key={layout}
      className={`shell-column shell-column-${side}`}
      {...columnDetailsProps(layout)}
    >
      <summary className="panel">{label}</summary>
      <div className="shell-column-body">{children}</div>
    </details>
  );
}

function subscribeToLayout(onChange: () => void): () => void {
  const queries = [WIDE_LAYOUT_QUERY, SHEETS_LAYOUT_QUERY].map((query) => window.matchMedia(query));
  for (const query of queries) query.addEventListener('change', onChange);
  return () => {
    for (const query of queries) query.removeEventListener('change', onChange);
  };
}

function currentLayout(): ShellLayout {
  return shellLayoutFor((query) => window.matchMedia(query).matches);
}
