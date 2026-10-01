import { NEO_ORBIT_CLASSES, type NeoCatalog } from '@perihelion/data';
import {
  type OrbitalElements,
  type Vector3,
  elementsFromDegrees,
  meanMotionRadPerDay,
  perifocalBasis,
  propagateElements,
} from '@perihelion/orbit';
import { sceneAxesFromEcliptic } from '../sceneFrame';

/** Highest eccentricity the GPU solver is given: 6 Newton steps are not enough closer to 1 (plan decision 2). */
export const MAX_SWARM_ECCENTRICITY = 0.99;

/** H for NEOs SBDB gives none for: drawn as the faintest objects in the catalog. */
export const UNKNOWN_ABSOLUTE_MAGNITUDE = 30;

/** Floats per NEO in each instanced attribute; the shaders declare the matching `vec3`/`vec2`. */
export const SWARM_ATTRIBUTE_SIZES = {
  motion: 3,
  perihelionAxisAu: 3,
  minorAxisAu: 3,
  appearance: 2,
} as const;

export type SwarmAttributeName = keyof typeof SWARM_ATTRIBUTE_SIZES;

export const SWARM_ATTRIBUTE_NAMES = Object.keys(SWARM_ATTRIBUTE_SIZES) as SwarmAttributeName[];

export interface SwarmAttributes extends Record<SwarmAttributeName, Float32Array> {
  count: number;
  /** The epoch the stored mean anomalies refer to; the shader gets `jdTdb − referenceJdTdb` each frame. */
  referenceJdTdb: number;
}

interface AttributeSlot {
  attributes: SwarmAttributes;
  index: number;
}

/** Built once per load, in float64 through the engine; only the finished values are rounded to float32. */
export function buildSwarmAttributes(catalog: NeoCatalog, referenceJdTdb: number): SwarmAttributes {
  const attributes = allocateSwarmAttributes(catalog.count, referenceJdTdb);
  for (let index = 0; index < catalog.count; index += 1) {
    const elements = clampEccentricity(
      propagateElements(neoElementsAt(catalog, index), referenceJdTdb),
    );
    const slot = { attributes, index };
    writeMotion(elements, slot);
    writeAxes(elements, slot);
    writeAppearance(appearanceAt(catalog, index), slot);
  }
  return attributes;
}

export function neoElementsAt(catalog: NeoCatalog, index: number): OrbitalElements {
  return elementsFromDegrees({
    epochJdTdb: columnValue(catalog.epochJdTdb, index),
    eccentricity: columnValue(catalog.eccentricity, index),
    semiMajorAxisAu: columnValue(catalog.semiMajorAxisAu, index),
    inclinationDeg: columnValue(catalog.inclinationDeg, index),
    longitudeOfAscendingNodeDeg: columnValue(catalog.longitudeOfAscendingNodeDeg, index),
    argumentOfPerihelionDeg: columnValue(catalog.argumentOfPerihelionDeg, index),
    meanAnomalyDeg: columnValue(catalog.meanAnomalyDeg, index),
  });
}

/**
 * Catalog columns (checked by the schema) and attribute arrays (allocated to match) always have `count`
 * entries, so a miss here is a bug, not bad data.
 */
export function columnValue<T>(column: ArrayLike<T>, index: number): T {
  const value = column[index];
  if (value === undefined) throw new RangeError(`Column has no entry ${index}`);
  return value;
}

function allocateSwarmAttributes(count: number, referenceJdTdb: number): SwarmAttributes {
  return {
    count,
    referenceJdTdb,
    motion: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.motion),
    perihelionAxisAu: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.perihelionAxisAu),
    minorAxisAu: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.minorAxisAu),
    appearance: new Float32Array(count * SWARM_ATTRIBUTE_SIZES.appearance),
  };
}

function clampEccentricity(elements: OrbitalElements): OrbitalElements {
  return { ...elements, eccentricity: Math.min(elements.eccentricity, MAX_SWARM_ECCENTRICITY) };
}

function writeMotion(elements: OrbitalElements, { attributes, index }: AttributeSlot): void {
  const meanMotion = meanMotionRadPerDay(elements.semiMajorAxisAu);
  const values = [elements.eccentricity, elements.meanAnomalyRad, meanMotion];
  attributes.motion.set(values, index * SWARM_ATTRIBUTE_SIZES.motion);
}

function writeAxes(elements: OrbitalElements, { attributes, index }: AttributeSlot): void {
  const { semiMajorAxisAu, eccentricity } = elements;
  const semiMinorAxisAu = semiMajorAxisAu * Math.sqrt(1 - eccentricity ** 2);
  const { towardPerihelion, towardQuadrature } = perifocalBasis(elements);
  const perihelionAxis = sceneAxesFromEcliptic(scaledVector(towardPerihelion, semiMajorAxisAu));
  const minorAxis = sceneAxesFromEcliptic(scaledVector(towardQuadrature, semiMinorAxisAu));
  attributes.perihelionAxisAu.set(perihelionAxis, index * SWARM_ATTRIBUTE_SIZES.perihelionAxisAu);
  attributes.minorAxisAu.set(minorAxis, index * SWARM_ATTRIBUTE_SIZES.minorAxisAu);
}

function appearanceAt(catalog: NeoCatalog, index: number): [number, number] {
  const absoluteMagnitude =
    columnValue(catalog.absoluteMagnitude, index) ?? UNKNOWN_ABSOLUTE_MAGNITUDE;
  return [absoluteMagnitude, NEO_ORBIT_CLASSES.indexOf(columnValue(catalog.orbitClass, index))];
}

function writeAppearance(appearance: [number, number], { attributes, index }: AttributeSlot): void {
  attributes.appearance.set(appearance, index * SWARM_ATTRIBUTE_SIZES.appearance);
}

function scaledVector(vector: Readonly<Vector3>, factor: number): Vector3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}
