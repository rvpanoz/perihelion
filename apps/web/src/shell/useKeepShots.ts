import { useEffect } from 'react';
import type { DatasetState } from '../data/useDataset';
import { keepShotsIn } from './shotSelection';

export interface ShotDatasets {
  closeApproaches: DatasetState<'close-approaches'>;
  cmes: DatasetState<'cmes'>;
}

/** A rare commit (a list arriving or going live), never per frame: each new list re-points its selection. */
export function useKeepShots({ closeApproaches, cmes }: ShotDatasets): void {
  const approachList = closeApproaches.status === 'ready' ? closeApproaches.data : undefined;
  const cmeList = cmes.status === 'ready' ? cmes.data : undefined;
  useEffect(() => keepShotsIn({ approaches: approachList }), [approachList]);
  useEffect(() => keepShotsIn({ cmes: cmeList }), [cmeList]);
}
