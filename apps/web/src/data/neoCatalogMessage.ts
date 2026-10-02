import {
  type DatasetOrigin,
  type DatasetResponse,
  NEO_ORBIT_CLASSES,
  type NeoCatalog,
  type NeoOrbitClass,
} from '@perihelion/data';
import {
  SWARM_ATTRIBUTE_NAMES,
  type SwarmAttributes,
  buildSwarmAttributes,
} from '../scene/swarm/swarmAttributes';
import { type DatasetLoader, loadDataset, loadDatasetOrUndefined } from './loadDataset';

/** The main thread's simulation time when it asks: the swarm's reference epoch. */
export interface NeoCatalogRequest {
  referenceJdTdb: number;
}

export type OrbitClassCounts = Record<NeoOrbitClass, number>;

/**
 * Everything the main thread reads from the catalog. The columns themselves stay in the worker: the scene needs only
 * the swarm attributes, and the shell only the count, the per-class counts and where the data came from.
 */
export interface NeoCatalogSummary {
  origin: DatasetOrigin;
  fetchedAt: string;
  count: number;
  orbitClassCounts: OrbitClassCounts;
  attributes: SwarmAttributes;
}

export type NeoCatalogMessage =
  { kind: 'ready'; summary: NeoCatalogSummary } | { kind: 'unavailable' };

export interface PostableNeoCatalogMessage {
  message: NeoCatalogMessage;
  /** The attribute buffers, moved to the receiver instead of copied. */
  transfer: ArrayBuffer[];
}

const UNAVAILABLE: PostableNeoCatalogMessage = { message: { kind: 'unavailable' }, transfer: [] };

/** The same path in the worker and, without one, on the main thread: validate, build, summarise. */
export async function loadNeoCatalogMessage(
  request: NeoCatalogRequest,
  load: DatasetLoader<'neos'> = () => loadDataset('neos'),
): Promise<PostableNeoCatalogMessage> {
  const response = await loadDatasetOrUndefined(load);
  return response === undefined ? UNAVAILABLE : neoCatalogMessage(response, request.referenceJdTdb);
}

export function neoCatalogMessage(
  response: DatasetResponse<'neos'>,
  referenceJdTdb: number,
): PostableNeoCatalogMessage {
  const attributes = buildSwarmAttributes(response.data, referenceJdTdb);
  const summary: NeoCatalogSummary = {
    origin: response.origin,
    fetchedAt: response.fetchedAt,
    count: response.data.count,
    orbitClassCounts: countOrbitClasses(response.data),
    attributes,
  };
  return { message: { kind: 'ready', summary }, transfer: attributeBuffers(attributes) };
}

function countOrbitClasses(catalog: NeoCatalog): OrbitClassCounts {
  const counts = Object.fromEntries(NEO_ORBIT_CLASSES.map((name) => [name, 0])) as OrbitClassCounts;
  for (const name of catalog.orbitClass) counts[name] += 1;
  return counts;
}

function attributeBuffers(attributes: SwarmAttributes): ArrayBuffer[] {
  return SWARM_ATTRIBUTE_NAMES.map((name) => attributes[name].buffer as ArrayBuffer);
}
