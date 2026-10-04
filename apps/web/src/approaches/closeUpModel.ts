import type { CloseApproach } from '@perihelion/data';
import { KM_PER_AU, type Vector3 } from '@perihelion/orbit';
import { trailForApproach, trailIndexAt } from '../scene/approach/approachTrail';
import { KM_PER_LUNAR_DISTANCE } from './approachFormat';

/** The mockup's close-up box (docs/dev/design/perihelion-mockup.html, `#lens`). */
export const CLOSE_UP_SIZE_PX = { width: 294, height: 172 } as const;
export const CLOSE_UP_CENTRE_PX = {
  x: CLOSE_UP_SIZE_PX.width / 2,
  y: CLOSE_UP_SIZE_PX.height / 2,
} as const;
export const LUNAR_DISTANCE_AU = KM_PER_LUNAR_DISTANCE / KM_PER_AU;
/** Four miss distances either side of Earth: the pass and enough run-in to read its direction. */
const MISS_DISTANCES_PER_HALF_SPAN = 4;
/** A little past 1 LD, so the ring is never cut by the frame on the closest passes. */
const MIN_HALF_SPAN_LUNAR_DISTANCES = 1.25;

export interface CloseUpPath {
  /** AU in the pass plane, Earth at the origin: x along the motion, y toward the closest point; 2 per sample. */
  points: Float64Array;
  closestIndex: number;
}

interface PassFrame {
  along: Vector3;
  toward: Vector3;
}

/** Projects a Task 4 trail onto its own pass plane; computed once per selection. */
export function closeUpPath(trail: Float32Array): CloseUpPath {
  const closestIndex = closestSampleIndex(trail);
  const frame = passFrame(trail, closestIndex);
  return { points: projectOntoPass(trail, frame), closestIndex };
}

export function closeUpHalfSpanAu(distanceAu: number): number {
  return Math.max(
    MISS_DISTANCES_PER_HALF_SPAN * distanceAu,
    MIN_HALF_SPAN_LUNAR_DISTANCES * LUNAR_DISTANCE_AU,
  );
}

/** The half-span fits the shorter side, the height, so a ring sized to it is never clipped. */
export function closeUpPixelsPerAu(halfSpanAu: number): number {
  return CLOSE_UP_CENTRE_PX.y / halfSpanAu;
}

/** SVG pixels with Earth at the centre; y is flipped so the closest point sits above Earth. */
export function closeUpPixelPoints(points: Float64Array, pixelsPerAu: number): Float64Array {
  const pixels = new Float64Array(points.length);
  for (let index = 0; index < points.length; index += 2) {
    pixels[index] = CLOSE_UP_CENTRE_PX.x + (points[index] ?? 0) * pixelsPerAu;
    pixels[index + 1] = CLOSE_UP_CENTRE_PX.y - (points[index + 1] ?? 0) * pixelsPerAu;
  }
  return pixels;
}

/** Outside the trail's window `trailIndexAt` pins to an end, where the asteroid is not, so there is no marker. */
export function closeUpMarkerIndex(offsetDays: number, halfWindowDays: number): number | undefined {
  if (Math.abs(offsetDays) > halfWindowDays) return undefined;
  return trailIndexAt(offsetDays, halfWindowDays);
}

/** The first of equally close samples, so a pass and its mirror image pick the same one. */
function closestSampleIndex(trail: Float32Array): number {
  let closestIndex = 0;
  let closestSquaredAu = Infinity;
  for (let index = 0; index < trail.length / 3; index += 1) {
    const sample = sampleAt(trail, index);
    const squaredAu = dot(sample, sample);
    if (squaredAu < closestSquaredAu) {
      closestIndex = index;
      closestSquaredAu = squaredAu;
    }
  }
  return closestIndex;
}

/**
 * x follows the chord from the first sample to the last: the window is centred on the pass, so the chord is
 * parallel to the motion at closest approach. The closest sample's neighbours are ~1e-10 AU apart (u³ spacing),
 * below float32's resolution at ~0.01 AU, so their difference would be noise. y is the closest point with its x part
 * removed (Gram–Schmidt), so the frame comes from the trail itself, not from fixed axes.
 */
function passFrame(trail: Float32Array, closestIndex: number): PassFrame {
  const first = sampleAt(trail, 0);
  const last = sampleAt(trail, trail.length / 3 - 1);
  const along = normalized(subtract(last, first));
  const closest = sampleAt(trail, closestIndex);
  const toward = normalized(subtract(closest, scaled(along, dot(closest, along))));
  return { along, toward };
}

function projectOntoPass(trail: Float32Array, frame: PassFrame): Float64Array {
  const sampleCount = trail.length / 3;
  const points = new Float64Array(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = sampleAt(trail, index);
    points[index * 2] = dot(sample, frame.along);
    points[index * 2 + 1] = dot(sample, frame.toward);
  }
  return points;
}

function sampleAt(trail: Float32Array, index: number): Vector3 {
  return [trail[index * 3] ?? 0, trail[index * 3 + 1] ?? 0, trail[index * 3 + 2] ?? 0];
}

function dot(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function subtract(a: Vector3, b: Vector3): Vector3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaled(vector: Vector3, factor: number): Vector3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function normalized(vector: Vector3): Vector3 {
  return scaled(vector, 1 / Math.sqrt(dot(vector, vector)));
}

export interface CloseUpGeometry {
  /** SVG pixels, 2 per trail sample. */
  pixels: Float64Array;
  /** The same points as "x,y", so the 4 Hz readout only slices and joins. */
  pointTexts: string[];
  closestIndex: number;
  ringRadiusPx: number;
  halfWindowDays: number;
}

/** Everything the close-up draws that depends on the selection, not the clock. */
export function closeUpGeometry(approach: CloseApproach): CloseUpGeometry {
  const trail = trailForApproach(approach);
  const path = closeUpPath(trail.positions);
  const pixelsPerAu = closeUpPixelsPerAu(closeUpHalfSpanAu(approach.distanceAu));
  const pixels = closeUpPixelPoints(path.points, pixelsPerAu);
  return {
    pixels,
    pointTexts: pointTexts(pixels),
    closestIndex: path.closestIndex,
    ringRadiusPx: LUNAR_DISTANCE_AU * pixelsPerAu,
    halfWindowDays: trail.halfWindowDays,
  };
}

function pointTexts(pixels: Float64Array): string[] {
  const texts: string[] = [];
  for (let index = 0; index < pixels.length; index += 2) {
    texts.push(`${(pixels[index] ?? 0).toFixed(1)},${(pixels[index + 1] ?? 0).toFixed(1)}`);
  }
  return texts;
}
