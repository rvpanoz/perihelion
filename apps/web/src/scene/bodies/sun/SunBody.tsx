import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { timeStore } from '../../../time/timeStore';
import { FRAME_PRIORITY } from '../../framePriorities';
import { IGNORE_RAYCAST, useDisposal } from '../../swarm/swarmLayer';
import { SUN_LIGHT_INTENSITY, radiusAu } from '../bodyCatalog';
import {
  advanceSunPhase,
  createCoronaMaterial,
  createSunSurfaceMaterial,
  createSunUniforms,
} from './sunMaterials';

const SPHERE_SEGMENTS = { width: 64, height: 32 } as const;
/** A 2 × 2 quad: the corona shader scales it to its extent in view space. */
const CORONA_QUAD_SIZE = 2;

/**
 * The photosphere and corona. Their motion is illustrative, so it runs on the render clock while the simulation
 * clock plays and freezes when it pauses; following the simulated rate would boil the surface at a month per second.
 */
export function SunBody() {
  const uniforms = useMemo(() => createSunUniforms(), []);
  const surfaceMaterial = useMemo(() => createSunSurfaceMaterial(uniforms.surface), [uniforms]);
  const coronaMaterial = useMemo(() => createCoronaMaterial(uniforms.corona), [uniforms]);
  useDisposal(surfaceMaterial);
  useDisposal(coronaMaterial);
  useFrame((_, deltaSeconds) => {
    if (timeStore.state.playing) advanceSunPhase(uniforms.surface, deltaSeconds);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <>
      <mesh name="sun-surface" material={surfaceMaterial}>
        <sphereGeometry args={[radiusAu('sun'), SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height]} />
      </mesh>
      <mesh
        name="sun-corona"
        material={coronaMaterial}
        frustumCulled={false}
        raycast={IGNORE_RAYCAST}
      >
        <planeGeometry args={[CORONA_QUAD_SIZE, CORONA_QUAD_SIZE]} />
      </mesh>
      <pointLight intensity={SUN_LIGHT_INTENSITY} decay={0} />
    </>
  );
}
