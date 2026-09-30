import { useMemo } from 'react';
import { Line } from 'three';
import { IGNORE_RAYCAST, type SwarmLayerProps, useDisposal } from './swarmLayer';
import { createSwarmTrailGeometry, createSwarmTrailMaterial } from './swarmMesh';

/**
 * An instanced line strip per NEO. JSX `<line>` is SVG's, so the three.js Line goes in through `<primitive>`.
 * Culling is off for the same reason as the points: the unused base positions say nothing about where trails are.
 */
export function SwarmTrails({ attributes, uniforms }: SwarmLayerProps) {
  const geometry = useMemo(() => createSwarmTrailGeometry(attributes), [attributes]);
  const material = useMemo(() => createSwarmTrailMaterial(uniforms), [uniforms]);
  const line = useMemo(() => new Line(geometry, material), [geometry, material]);
  useDisposal(geometry);
  useDisposal(material);
  return (
    <primitive object={line} name="swarmTrails" frustumCulled={false} raycast={IGNORE_RAYCAST} />
  );
}
