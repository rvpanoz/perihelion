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
 * draggable in the gaps between them. The scene is the page's `<main>` landmark; the bars and columns stay outside it
 * so the header and footer keep their banner and contentinfo roles.
 */
export function AppShell({ top, left, right, bottom, children }: AppShellProps) {
  return (
    <>
      <main className="shell-scene">{children}</main>
      <div className="app-shell">
        <header className="shell-top">{top}</header>
        <div className="shell-left">{left}</div>
        <div className="shell-right">{right}</div>
        <footer className="shell-bottom">{bottom}</footer>
      </div>
    </>
  );
}
