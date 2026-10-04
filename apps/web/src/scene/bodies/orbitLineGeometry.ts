import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { ORBIT_PATH_POINTS } from './orbitPath';

/** `LineSegmentsGeometry` interleaves each segment as start xyz followed by end xyz. */
export const ORBIT_LINE_SEGMENT_FLOATS = 6;

/** A closed loop has one segment per point: the last runs from the last point back to the first. */
export function createOrbitLineSegments(): Float32Array {
  return new Float32Array(ORBIT_PATH_POINTS * ORBIT_LINE_SEGMENT_FLOATS);
}

/**
 * `setPositions` keeps the array it is given rather than copying it, so the geometry and its caller share one
 * buffer and a refresh is a write plus an upload, with nothing allocated per frame.
 */
export function createOrbitLineGeometry(segments: Float32Array): LineSegmentsGeometry {
  return new LineSegmentsGeometry().setPositions(segments);
}

/** Turns a path of points into the segment pairs the geometry draws, closing the loop. */
export function writeLoopSegments(pathAu: Float32Array, out: Float32Array): Float32Array {
  const points = pathAu.length / 3;
  for (let point = 0; point < points; point += 1) {
    const next = ((point + 1) % points) * 3;
    const segment = point * ORBIT_LINE_SEGMENT_FLOATS;
    for (let axis = 0; axis < 3; axis += 1) {
      out[segment + axis] = pathAu[point * 3 + axis] ?? 0;
      out[segment + 3 + axis] = pathAu[next + axis] ?? 0;
    }
  }
  return out;
}

/** Call once the shared segment array has been rewritten: the GPU copy and the cull extent both go stale. */
export function refreshOrbitLineGeometry(geometry: LineSegmentsGeometry): void {
  const instanceStart = geometry.getAttribute('instanceStart');
  if ('data' in instanceStart) instanceStart.data.needsUpdate = true;
  geometry.computeBoundingSphere();
}
