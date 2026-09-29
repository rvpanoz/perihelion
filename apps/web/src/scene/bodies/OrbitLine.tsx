import type { Planet } from '@perihelion/orbit';
import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import type { LineLoop } from 'three';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { writeSceneOffset } from '../sceneFrame';
import { BODY_APPEARANCE } from './bodyCatalog';
import { bodyPositions } from './bodyPositions';
import { ORBIT_PATH_POINTS, orbitPathIsStale, writeOrbitPath } from './orbitPath';

const ORBIT_LINE_OPACITY = 0.35;

/**
 * Vertices are float32 relative to the Sun, so a point on Earth's orbit carries ~1e-8 AU (≈ 1.5 km) of rounding:
 * invisible next to Earth's 6,371 km radius even at the closest zoom. Only the line's origin is float64-exact.
 */
export function OrbitLine({ planet }: { planet: Planet }) {
  const lineRef = useRef<LineLoop>(null);
  const vertices = useMemo(() => new Float32Array(ORBIT_PATH_POINTS * 3), []);
  useOrbitPathUpdates({ planet, lineRef });
  return (
    <lineLoop ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={BODY_APPEARANCE[planet].color}
        transparent
        opacity={ORBIT_LINE_OPACITY}
      />
    </lineLoop>
  );
}

function useOrbitPathUpdates({
  planet,
  lineRef,
}: {
  planet: Planet;
  lineRef: RefObject<LineLoop | null>;
}) {
  const pathJdTdbRef = useRef<number | undefined>(undefined);
  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    writeSceneOffset(bodyPositions.sun, line.position);
    const { jdTdb } = timeStore.state;
    const attribute = line.geometry.getAttribute('position');
    if (
      !orbitPathIsStale(pathJdTdbRef.current, jdTdb) ||
      !(attribute.array instanceof Float32Array)
    )
      return;
    writeOrbitPath({ planet, jdTdb }, attribute.array);
    attribute.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    pathJdTdbRef.current = jdTdb;
  }, FRAME_PRIORITY.sceneObjects);
}
