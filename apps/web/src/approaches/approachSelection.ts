import type { CloseApproach } from '@perihelion/data';
import { SelectionStore, useSelection } from '../state/selectionStore';

/** The approach the viewer picked. */
export class ApproachSelection extends SelectionStore<CloseApproach> {}

export const approachSelection = new ApproachSelection();

export function useSelectedApproach(): CloseApproach | undefined {
  return useSelection(approachSelection);
}
