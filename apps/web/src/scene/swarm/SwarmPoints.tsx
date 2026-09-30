import { useMemo } from 'react';
import { IGNORE_RAYCAST, type SwarmLayerProps, useDisposal } from './swarmLayer';
import { createSwarmGeometry, createSwarmMaterial } from './swarmMesh';

/** A bounding sphere of zeros means nothing, so frustum culling is off: the vertex shader places every point. */
export function SwarmPoints({ attributes, uniforms }: SwarmLayerProps) {
  const geometry = useMemo(() => createSwarmGeometry(attributes), [attributes]);
  const material = useMemo(() => createSwarmMaterial(uniforms), [uniforms]);
  useDisposal(geometry);
  useDisposal(material);
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
