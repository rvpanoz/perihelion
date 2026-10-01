import type { CloseApproach } from '@perihelion/data';
import { type OrbitalElements, type Vector3, writeGeocentricOffset } from '@perihelion/orbit';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { crossingDays } from './approachTiming';
import { elementsForApproach } from './asteroidPosition';

export const TRAIL_POINTS = 512;
/** The trail covers ±8 crossing times: the bend of the pass and the straight run-in either side of it. */
export const TRAIL_HALF_WINDOW_CROSSINGS = 8;

const scratchOffset: Vector3 = [0, 0, 0];
const trailCache = new WeakMap<CloseApproach, TrailSamples>();

export interface TrailRequest {
  elements: OrbitalElements;
  approachJdTdb: number;
  halfWindowDays: number;
}

export interface TrailSamples {
  /** Scene axes, AU from the Earth–Moon barycentre, 3 numbers per sample. */
  positions: Float32Array;
  halfWindowDays: number;
}

/**
 * Offsets go as u³ for u evenly spaced in [−1, 1]: dense at closest approach, where a grazing pass bends within
 * minutes, and sparse days away, where the path is nearly straight.
 */
export function trailOffsetDays(index: number, halfWindowDays: number): number {
  const u = (2 * index) / (TRAIL_POINTS - 1) - 1;
  return halfWindowDays * u ** 3;
}

/** The sample nearest a time offset, so the bright "past" part of the trail ends at the asteroid. */
export function trailIndexAt(offsetDays: number, halfWindowDays: number): number {
  const u = Math.cbrt(offsetDays / halfWindowDays);
  const index = Math.round(((u + 1) * (TRAIL_POINTS - 1)) / 2);
  return Math.min(Math.max(index, 0), TRAIL_POINTS - 1);
}

/**
 * The path relative to Earth, not the Sun: drawn anchored at Earth it is the flyby's bend, and the asteroid's
 * current position always lies on it. Float32 relative to Earth keeps ~1e-7 of the offset, metres for a close pass.
 */
export function writeTrail(request: TrailRequest, out: Float32Array): Float32Array {
  for (let index = 0; index < TRAIL_POINTS; index += 1) {
    const jdTdb = request.approachJdTdb + trailOffsetDays(index, request.halfWindowDays);
    writeGeocentricOffset({ elements: request.elements, jdTdb }, scratchOffset);
    out.set(sceneAxesFromEcliptic(scratchOffset, scratchOffset), index * 3);
  }
  return out;
}

/** Memoised by row identity, so the scene's lines and the card's close-up share one computed path. */
export function trailForApproach(approach: CloseApproach): TrailSamples {
  const cached = trailCache.get(approach);
  if (cached !== undefined) return cached;
  const trail = buildTrailSamples(approach);
  trailCache.set(approach, trail);
  return trail;
}

function buildTrailSamples(approach: CloseApproach): TrailSamples {
  const halfWindowDays = TRAIL_HALF_WINDOW_CROSSINGS * crossingDays(approach);
  const request = {
    elements: elementsForApproach(approach),
    approachJdTdb: approach.approachJdTdb,
    halfWindowDays,
  };
  return { positions: writeTrail(request, new Float32Array(TRAIL_POINTS * 3)), halfWindowDays };
}
