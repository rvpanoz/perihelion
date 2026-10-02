import type { CloseApproach, Cme } from '@perihelion/data';
import { approachKey } from '../approaches/approachKey';
import { approachSelection } from '../approaches/approachSelection';
import { clearApproach, selectApproach } from '../approaches/playApproach';
import { type CmeSelection, cmeSelection } from '../eruptions/cmeSelection';
import type { SelectionStore } from '../state/selectionStore';

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

/** What a data swap re-points: the app's stores by default, fakes in tests. */
export interface KeepShotTargets {
  approaches: Pick<SelectionStore<CloseApproach>, 'reselectFrom'>;
  cmes: Pick<SelectionStore<Cme>, 'reselectFrom' | 'clear'>;
  clearApproach: () => void;
}

/** The lists on screen; one still loading is left out, and its selection left alone. */
export interface ShotLists {
  approaches?: readonly CloseApproach[];
  cmes?: readonly Cme[];
}

const APP_KEEP_TARGETS: KeepShotTargets = {
  approaches: approachSelection,
  cmes: cmeSelection,
  clearApproach: () => clearApproach(),
};

/**
 * Live data replaced the snapshot (Review Focus 3): each selection moves to its row in the new list, by key, without
 * a camera flight; a row the new list lacks is cleared, an approach through `clearApproach` so a camera on its
 * asteroid returns to Earth.
 */
export function keepShotsIn(lists: ShotLists, targets = APP_KEEP_TARGETS): void {
  const { approaches, cmes } = lists;
  if (approaches && !targets.approaches.reselectFrom(approaches, approachKey))
    targets.clearApproach();
  if (cmes && !targets.cmes.reselectFrom(cmes, (cme) => cme.activityId)) targets.cmes.clear();
}
