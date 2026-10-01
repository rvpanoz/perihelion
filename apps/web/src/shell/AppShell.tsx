import type { ReactNode } from 'react';

export interface AppShellProps {
  top: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  bottom: ReactNode;
  /** The full-bleed canvas, and anything else drawn under the shell. */
  children: ReactNode;
}

/**
 * One grid laid over the canvas. The grid ignores the pointer and only panels take it, so the scene stays
 * draggable in the gaps between them.
 */
export function AppShell({ top, left, right, bottom, children }: AppShellProps) {
  return (
    <>
      {children}
      <div className="app-shell">
        <header className="shell-top">{top}</header>
        <div className="shell-left">{left}</div>
        <div className="shell-right">{right}</div>
        <footer className="shell-bottom">{bottom}</footer>
      </div>
    </>
  );
}
