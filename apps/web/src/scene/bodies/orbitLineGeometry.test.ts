import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { describe, expect, it } from 'vitest';
import { ORBIT_PATH_POINTS } from './orbitPath';
import {
  ORBIT_LINE_SEGMENT_FLOATS,
  createOrbitLineGeometry,
  createOrbitLineSegments,
  refreshOrbitLineGeometry,
  writeLoopSegments,
} from './orbitLineGeometry';

/** `needsUpdate` on an interleaved buffer is write-only; the version it bumps is what the renderer reads. */
function uploads(geometry: LineSegmentsGeometry): number {
  const instanceStart = geometry.getAttribute('instanceStart');
  return 'data' in instanceStart ? instanceStart.data.version : Number.NaN;
}

/** Four points of a square, as `writeOrbitPath` would leave them. */
const SQUARE = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);

describe('writeLoopSegments', () => {
  it('pairs each point with the next, and the last with the first', () => {
    const out = new Float32Array(4 * ORBIT_LINE_SEGMENT_FLOATS);
    writeLoopSegments(SQUARE, out);
    expect(Array.from(out)).toEqual([
      0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
    ]);
  });

  it('writes one segment per point, so the loop closes', () => {
    const segments = createOrbitLineSegments();
    expect(segments).toHaveLength(ORBIT_PATH_POINTS * ORBIT_LINE_SEGMENT_FLOATS);
  });
});

describe('createOrbitLineGeometry', () => {
  it('draws one instance per segment from the array it was given, without copying it', () => {
    const segments = createOrbitLineSegments();
    const geometry = createOrbitLineGeometry(segments);
    expect(geometry.instanceCount).toBe(ORBIT_PATH_POINTS);
    expect(geometry.getAttribute('instanceStart').array).toBe(segments);
    expect(geometry.getAttribute('instanceEnd').array).toBe(segments);
  });
});

describe('refreshOrbitLineGeometry', () => {
  it('uploads the rewritten segments and takes the new extent', () => {
    const segments = createOrbitLineSegments();
    const geometry = createOrbitLineGeometry(segments);
    const before = uploads(geometry);
    writeLoopSegments(SQUARE, segments);
    refreshOrbitLineGeometry(geometry);
    expect(uploads(geometry)).toBeGreaterThan(before);
    expect(geometry.boundingSphere?.radius).toBeGreaterThan(0);
  });
});
