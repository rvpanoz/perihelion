import type { Planet } from '@perihelion/orbit';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import { useDisposal } from '../swarm/swarmLayer';
import { bodyPositions } from './bodyPositions';
import {
  createOrbitLineGeometry,
  createOrbitLineSegments,
  refreshOrbitLineGeometry,
  writeLoopSegments,
} from './orbitLineGeometry';
import { createOrbitLineMaterial, writeOrbitLineResolution } from './orbitLineMaterial';
import { ORBIT_PATH_POINTS, orbitPathIsStale, writeOrbitPath } from './orbitPath';

/** Every line is rewritten in the same frame, one after another, so they can share one scratch path. */
const scratchPath = new Float32Array(ORBIT_PATH_POINTS * 3);

/** The drawn line and the buffer it reads: the geometry keeps the array rather than copying it. */
interface OrbitLineParts {
  line: LineSegments2;
  segments: Float32Array;
}

/**
 * Vertices are float32 relative to the Sun, so a point on Earth's orbit carries ~1e-8 AU (≈ 1.5 km) of rounding:
 * invisible next to Earth's 6,371 km radius even at the closest zoom. Only the line's origin is float64-exact.
 *
 * A path goes stale about ten times a second at full speed, so it is rewritten straight into the geometry's buffer
 * from `useFrame`; nothing about a refresh passes through React.
 */
export function OrbitLine({ planet }: { planet: Planet }) {
  const parts = useOrbitLine(planet);
  useOrbitLineResolution(parts.line);
  useOrbitPathUpdates({ planet, ...parts });
  return <primitive object={parts.line} />;
}

function useOrbitLine(planet: Planet): OrbitLineParts {
  const parts = useMemo(() => {
    const segments = createOrbitLineSegments();
    const line = new LineSegments2(
      createOrbitLineGeometry(segments),
      createOrbitLineMaterial(planet),
    );
    return { line, segments };
  }, [planet]);
  useDisposal(parts.line.geometry);
  useDisposal(parts.line.material);
  return parts;
}

/** The shader sizes the line from the canvas, which changes only when the window does. */
function useOrbitLineResolution(line: LineSegments2): void {
  const canvas = useThree((state) => state.size);
  useEffect(() => {
    writeOrbitLineResolution(line.material, canvas);
  }, [line, canvas]);
}

function useOrbitPathUpdates({
  planet,
  line,
  segments,
}: OrbitLineParts & { planet: Planet }): void {
  const pathJdTdbRef = useRef<number | undefined>(undefined);
  useFrame(() => {
    writeSceneOffset(bodyPositions.sun, line.position);
    const { jdTdb } = timeStore.state;
    if (!orbitPathIsStale(pathJdTdbRef.current, jdTdb)) return;
    writeLoopSegments(writeOrbitPath({ planet, jdTdb }, scratchPath), segments);
    refreshOrbitLineGeometry(line.geometry);
    pathJdTdbRef.current = jdTdb;
  }, FRAME_PRIORITY.sceneObjects);
}
