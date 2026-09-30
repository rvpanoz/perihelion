import type { NeoCatalog } from '@perihelion/data';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { replicateSwarmAttributes } from '../../dev/swarmStress';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { buildSwarmAttributes } from './swarmAttributes';
import { SwarmPoints } from './SwarmPoints';
import { SwarmTrails } from './SwarmTrails';
import { createSwarmUniforms, writeSwarmUniforms } from './swarmUniforms';

export interface SwarmProps {
  catalog: NeoCatalog;
  showTrails: boolean;
  /** Dev only (`?swarmStress=N`): the catalog drawn this many times over, for the headroom run. */
  stressCopies?: number;
}

/**
 * The reference epoch is the simulation time when the catalog arrives. Points and trails share the attributes
 * and one set of uniforms, so a single write per frame moves both. Trails unmount when off, so they cost nothing.
 */
export function Swarm({ catalog, showTrails, stressCopies = 1 }: SwarmProps) {
  const attributes = useMemo(() => {
    const built = buildSwarmAttributes(catalog, timeStore.state.jdTdb);
    return import.meta.env.DEV ? replicateSwarmAttributes(built, stressCopies) : built;
  }, [catalog, stressCopies]);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const uniforms = useMemo(() => createSwarmUniforms(pixelRatio), [pixelRatio]);
  useFrame(() => {
    writeSwarmUniforms(uniforms, timeStore.state.jdTdb - attributes.referenceJdTdb);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <>
      <SwarmPoints attributes={attributes} uniforms={uniforms} />
      {showTrails && <SwarmTrails attributes={attributes} uniforms={uniforms} />}
    </>
  );
}
