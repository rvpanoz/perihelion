import type { NeoCatalog } from '@perihelion/data';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { buildSwarmAttributes } from './swarmAttributes';
import { createSwarmGeometry, createSwarmMaterial } from './swarmMesh';
import { createSwarmUniforms, writeSwarmUniforms } from './swarmUniforms';

/** three.js hit-tests points within 1 world unit (1 AU here), so the swarm would swallow every click. */
const IGNORE_RAYCAST = () => undefined;

/**
 * The reference epoch is the simulation time when the catalog arrives. A bounding sphere of zeros means nothing,
 * so frustum culling is off: the vertex shader decides where every point goes.
 */
export function Swarm({ catalog }: { catalog: NeoCatalog }) {
  const attributes = useMemo(() => buildSwarmAttributes(catalog, timeStore.state.jdTdb), [catalog]);
  const geometry = useMemo(() => createSwarmGeometry(attributes), [attributes]);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const uniforms = useMemo(() => createSwarmUniforms(pixelRatio), [pixelRatio]);
  const material = useMemo(() => createSwarmMaterial(uniforms), [uniforms]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    writeSwarmUniforms(uniforms, timeStore.state.jdTdb - attributes.referenceJdTdb);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <points
      name="swarm"
      geometry={geometry}
      material={material}
      frustumCulled={false}
      raycast={IGNORE_RAYCAST}
    />
  );
}
