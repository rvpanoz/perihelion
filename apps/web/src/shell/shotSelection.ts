import type { CloseApproach, Cme } from '@perihelion/data';
import { clearApproach, selectApproach } from '../approaches/playApproach';
import { type CmeSelection, cmeSelection } from '../eruptions/cmeSelection';

/** What a choice drives: the app's stores by default, fakes in tests. */
export interface ShotTargets {
  cmes: Pick<CmeSelection, 'select' | 'clear'>;
  selectApproach: (approach: CloseApproach) => void;
  clearApproach: () => void;
}

const APP_TARGETS: ShotTargets = {
  cmes: cmeSelection,
  selectApproach: (approach) => selectApproach(approach),
  clearApproach: () => clearApproach(),
};

/** One shot at a time (Task 4 decision 1): an approach replaces the CME. */
export function chooseApproach(approach: CloseApproach, targets = APP_TARGETS): void {
  targets.cmes.clear();
  targets.selectApproach(approach);
}

/** A CME replaces the approach; a camera following its asteroid returns to Earth (`clearApproach`). */
export function chooseCme(cme: Cme, targets = APP_TARGETS): void {
  targets.clearApproach();
  targets.cmes.select(cme);
}
