import { type DatasetLoader, type DatasetState, useDataset } from './useDataset';

export type NeoCatalogState = DatasetState<'neos'>;

/** Without the catalog the scene runs on with no swarm; the data-status pill says why. */
export function useNeoCatalog(load?: DatasetLoader<'neos'>): NeoCatalogState {
  return useDataset('neos', load);
}
