import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh, Texture } from 'three';
import { timeStore } from '../../../time/timeStore';
import { FRAME_PRIORITY } from '../../framePriorities';
import { IGNORE_RAYCAST, useDisposal } from '../../swarm/swarmLayer';
import { radiusAu } from '../bodyCatalog';
import { bodyPositions } from '../bodyPositions';
import { EARTH_LOOK } from './earthLook';
import {
  createAtmosphereMaterial,
  createEarthSurfaceMaterial,
  createEarthUniforms,
} from './earthMaterials';
import { writeEarthRotation, writeSunDirectionFromEarth } from './earthOrientation';

const SPHERE_SEGMENTS = { width: 96, height: 48 } as const;

/**
 * Earth with its day map turned to the real Earth Rotation Angle, so the side facing the Sun shows the right
 * continents. `Body` draws the plain sphere until the map has loaded (`earthDayMap`).
 */
export function EarthBody({ dayMap }: { dayMap: Texture }) {
  const uniforms = useMemo(() => createEarthUniforms(dayMap), [dayMap]);
  const surfaceMaterial = useMemo(() => createEarthSurfaceMaterial(uniforms.surface), [uniforms]);
  const atmosphereMaterial = useMemo(
    () => createAtmosphereMaterial(uniforms.atmosphere),
    [uniforms],
  );
  useDisposal(surfaceMaterial);
  useDisposal(atmosphereMaterial);
  const surfaceRef = useRef<Mesh>(null);
  useFrame(() => {
    writeSunDirectionFromEarth(
      bodyPositions.earthMoonBarycenter,
      uniforms.surface.sunDirection.value,
    );
    const surface = surfaceRef.current;
    if (!surface) return;
    writeEarthRotation(timeStore.state.jdTdb, surface.matrix);
    surface.matrixWorldNeedsUpdate = true;
  }, FRAME_PRIORITY.sceneObjects);
  const radius = radiusAu('earthMoonBarycenter');
  return (
    <>
      <mesh
        ref={surfaceRef}
        name="earth-surface"
        material={surfaceMaterial}
        matrixAutoUpdate={false}
      >
        <sphereGeometry args={[radius, SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height]} />
      </mesh>
      <mesh name="earth-atmosphere" material={atmosphereMaterial} raycast={IGNORE_RAYCAST}>
        <sphereGeometry
          args={[
            radius * EARTH_LOOK.haloRadiusRatio,
            SPHERE_SEGMENTS.width,
            SPHERE_SEGMENTS.height,
          ]}
        />
      </mesh>
    </>
  );
}
