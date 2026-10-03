import { Suspense, lazy, useEffect, useState, useSyncExternalStore } from 'react';
import { helpStore } from './helpStore';
import { listenForHelpShortcut } from './helpShortcut';

// The guide's copy and stills load on first open, not with the app: the first download is close to its budget.
const HelpDialog = lazy(() => import('./HelpDialog'));

const isHelpOpen = () => helpStore.isOpen;

/** The top bar's `?` button and the `?` key, both opening the guide. */
export function HelpControl() {
  const isOpen = useSyncExternalStore(helpStore.subscribe, isHelpOpen, isHelpOpen);
  const hasOpened = useHasBeenTrue(isOpen);
  useEffect(() => listenForHelpShortcut(window, helpStore.open), []);
  return (
    <>
      <HelpButton onOpen={helpStore.open} />
      {hasOpened && (
        <Suspense fallback={null}>
          <HelpDialog open={isOpen} onClose={helpStore.close} />
        </Suspense>
      )}
    </>
  );
}

export function HelpButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="panel help-button"
      aria-label="Help"
      aria-haspopup="dialog"
      aria-keyshortcuts="?"
      onClick={onOpen}
    >
      ?
    </button>
  );
}

/** Once the dialog has loaded it stays mounted, so closing keeps the chosen tab and reopening needs no new load. */
function useHasBeenTrue(value: boolean): boolean {
  const [hasBeenTrue, setHasBeenTrue] = useState(value);
  if (value && !hasBeenTrue) setHasBeenTrue(true);
  return hasBeenTrue || value;
}
