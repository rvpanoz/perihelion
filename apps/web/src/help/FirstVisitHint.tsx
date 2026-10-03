import { useSyncExternalStore } from 'react';
import { type OpeningPhase, openingStore } from '../scene/opening/openingStore';
import { helpStore } from './helpStore';

export interface HintState {
  openingPhase: OpeningPhase;
  hintSeen: boolean;
}

/** After the opening, never over it: the opening's caption holds that spot until then. */
export function showsFirstVisitHint({ openingPhase, hintSeen }: HintState): boolean {
  return openingPhase === 'done' && !hintSeen;
}

/** One dismissible line for a first-time visitor; dismissing it, or opening help, hides it for good. */
export function FirstVisitHint() {
  const openingPhase = useSyncExternalStore(openingStore.subscribe, () => openingStore.phase);
  const hintSeen = useSyncExternalStore(helpStore.subscribe, () => helpStore.hintSeen);
  if (!showsFirstVisitHint({ openingPhase, hintSeen })) return null;
  return <FirstVisitHintView onDismiss={helpStore.dismissHint} />;
}

export function FirstVisitHintView({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="caption first-visit-hint" role="status">
      <p className="caption-text">
        New here? Press <kbd>?</kbd> for a short guide.
      </p>
      <button type="button" className="hint-dismiss" aria-label="Dismiss hint" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
