import type { DatasetName } from '@perihelion/data';
import type { CachedDataset, SnapshotReader } from '../datasets/types.js';

export const NO_SNAPSHOTS: SnapshotReader = { read: async () => undefined };

export function snapshotsOf(datasets: Partial<Record<DatasetName, CachedDataset>>): SnapshotReader {
  return { read: async (name) => datasets[name] };
}
