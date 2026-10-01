import type { CloseApproach } from '@perihelion/data';
import {
  type OrbitalElements,
  type Vector3,
  cross,
  writeGeocentricOffset,
} from '@perihelion/orbit';
import { writeUnit } from './approachCamera';
import { crossingDays } from './approachTiming';
import { elementsForApproach } from './asteroidPosition';

export interface PassSpan {
  elements: OrbitalElements;
  approachJdTdb: number;
  halfSpanDays: number;
}

const normalCache = new WeakMap<CloseApproach, Readonly<Vector3>>();
const scratchBefore: Vector3 = [0, 0, 0];
const scratchAfter: Vector3 = [0, 0, 0];

/** Memoised by row identity like `elementsForApproach`: the chase reads it every frame. */
export function passNormalForApproach(approach: CloseApproach): Readonly<Vector3> {
  const cached = normalCache.get(approach);
  if (cached !== undefined) return cached;
  const span = {
    elements: elementsForApproach(approach),
    approachJdTdb: approach.approachJdTdb,
    halfSpanDays: crossingDays(approach),
  };
  const normal = writePassNormal(span, [0, 0, 0]);
  normalCache.set(approach, normal);
  return normal;
}

/**
 * The normal of the plane through Earth that holds the pass: the cross product of the geocentric offsets a crossing
 * time either side of closest approach. Earth's pull is left out and the Sun's differential pull bends the path out
 * of that plane by ~1e-4 rad over the pass, so one normal serves the whole flyby. Signed toward ecliptic north, so
 * a low-inclination pass tilts the camera up the screen.
 */
export function writePassNormal(span: PassSpan, out: Vector3): Vector3 {
  const { elements, approachJdTdb, halfSpanDays } = span;
  writeGeocentricOffset({ elements, jdTdb: approachJdTdb - halfSpanDays }, scratchBefore);
  writeGeocentricOffset({ elements, jdTdb: approachJdTdb + halfSpanDays }, scratchAfter);
  const normal = cross(scratchBefore, scratchAfter);
  const sign = normal[2] < 0 ? -1 : 1;
  for (const axis of [0, 1, 2] as const) out[axis] = sign * normal[axis];
  return writeUnit(out, out);
}
