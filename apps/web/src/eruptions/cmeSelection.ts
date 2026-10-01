import type { Cme } from '@perihelion/data';
import { SelectionStore, useSelection } from '../state/selectionStore';

/** The CME the viewer picked: every eruption scene element reads it. */
export class CmeSelection extends SelectionStore<Cme> {}

export const cmeSelection = new CmeSelection();

export function useSelectedCme(): Cme | undefined {
  return useSelection(cmeSelection);
}
