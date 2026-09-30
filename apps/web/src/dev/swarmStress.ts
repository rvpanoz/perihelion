import {
  columnValue,
  SWARM_ATTRIBUTE_NAMES,
  type SwarmAttributes,
} from '../scene/swarm/swarmAttributes';

/** Enough to show the headroom a slower mid-range GPU would need; more only measures the dev machine's limits. */
export const MAX_SWARM_STRESS_COPIES = 8;

/** `writeMotion` packs each NEO's motion as [e, M, n]. */
const MEAN_ANOMALY_COMPONENT = 1;
const FULL_TURN_RAD = 2 * Math.PI;

/** The dev-only `?swarmStress=N`; anything missing or unreadable draws the catalog once. */
export function swarmStressCopiesFromUrl(search: string): number {
  const copies = Number.parseInt(new URLSearchParams(search).get('swarmStress') ?? '', 10);
  if (!Number.isFinite(copies) || copies < 1) return 1;
  return Math.min(copies, MAX_SWARM_STRESS_COPIES);
}

/**
 * The catalog drawn `copies` times over. Copy k's mean anomalies move on by 2π·k/copies, spreading the copies round
 * their orbits, so they don't draw on top of each other and the extra fill is real.
 */
export function replicateSwarmAttributes(
  attributes: SwarmAttributes,
  copies: number,
): SwarmAttributes {
  if (copies === 1) return attributes;
  const replicated = { ...attributes, count: attributes.count * copies };
  for (const name of SWARM_ATTRIBUTE_NAMES) replicated[name] = tile(attributes[name], copies);
  offsetMeanAnomalies(replicated, attributes.count);
  return replicated;
}

function tile(values: Float32Array, copies: number): Float32Array {
  const tiled = new Float32Array(values.length * copies);
  for (let copy = 0; copy < copies; copy += 1) tiled.set(values, copy * values.length);
  return tiled;
}

function offsetMeanAnomalies(replicated: SwarmAttributes, originalCount: number): void {
  const copies = replicated.count / originalCount;
  const stride = replicated.motion.length / replicated.count;
  for (let index = originalCount; index < replicated.count; index += 1) {
    const copy = Math.floor(index / originalCount);
    const slot = index * stride + MEAN_ANOMALY_COMPONENT;
    const shifted = columnValue(replicated.motion, slot) + (FULL_TURN_RAD * copy) / copies;
    replicated.motion[slot] = ((shifted % FULL_TURN_RAD) + FULL_TURN_RAD) % FULL_TURN_RAD;
  }
}
