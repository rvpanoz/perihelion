import { type ReactNode, useSyncExternalStore } from 'react';

const WIDE_LAYOUT_QUERY = '(min-width: 1100px)';

export interface ShellColumnProps {
  side: 'left' | 'right';
  label: string;
  children: ReactNode;
}

/**
 * Wide screens show the column open with its summary hidden; narrow ones get a closed drawer. Remounting on the
 * breakpoint (the key) resets the open state, so a drawer closed on a phone is not left shut on a desktop.
 */
export function ShellColumn({ side, label, children }: ShellColumnProps) {
  const wide = useSyncExternalStore(subscribeToLayout, isWideLayout, () => true);
  return (
    <details
      key={wide ? 'wide' : 'narrow'}
      className={`shell-column shell-column-${side}`}
      open={wide}
    >
      <summary className="panel">{label}</summary>
      <div className="shell-column-body">{children}</div>
    </details>
  );
}

function subscribeToLayout(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE_LAYOUT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function isWideLayout(): boolean {
  return window.matchMedia(WIDE_LAYOUT_QUERY).matches;
}
