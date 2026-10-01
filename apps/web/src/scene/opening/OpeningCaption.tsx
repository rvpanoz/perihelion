import { useSyncExternalStore } from 'react';
import { openingCaptionText } from './openingCaptionText';
import { openingStore } from './openingStore';

/**
 * Shown while the opening plays and faded out by CSS after it ends. Without the catalog there is no count, the
 * caption's only fact, so there is no caption; the opening still plays.
 */
export function OpeningCaption({ neoCount }: { neoCount: number | undefined }) {
  const phase = useSyncExternalStore(openingStore.subscribe, () => openingStore.phase);
  if (neoCount === undefined) return null;
  return (
    <div className="caption opening-caption" data-phase={phase}>
      <p className="caption-kicker">THE SWARM</p>
      <p className="caption-text">{openingCaptionText(neoCount)}</p>
    </div>
  );
}
