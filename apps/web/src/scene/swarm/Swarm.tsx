import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useState } from 'react';
import { replicateSwarmAttributes } from '../../dev/swarmStress';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import type { SwarmAttributes } from './swarmAttributes';
import { swarmFadeIn } from './swarmLook';
import { SwarmPoints } from './SwarmPoints';
import { SwarmTrails } from './SwarmTrails';
import {
  type SwarmUniforms,
  createSwarmUniforms,
  writeSwarmFadeIn,
  writeSwarmUniforms,
} from './swarmUniforms';

export interface SwarmProps {
  /** Built off the main thread (`neoCatalogWorker.ts`), at the simulation time the load started. */
  attributes: SwarmAttributes;
  showTrails: boolean;
  /** Dev only (`?swarmStress=N`): the catalog drawn this many times over, for the headroom run. */
  stressCopies?: number;
}

/**
 * Points and trails share the attributes and one set of uniforms, so a single write per frame moves both. Trails
 * unmount when off, so they cost nothing.
 */
export function Swarm({ attributes: built, showTrails, stressCopies = 1 }: SwarmProps) {
  const attributes = useMemo(
    () => (import.meta.env.DEV ? replicateSwarmAttributes(built, stressCopies) : built),
    [built, stressCopies],
  );
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const uniforms = useMemo(() => createSwarmUniforms(pixelRatio), [pixelRatio]);
  useFrame(() => {
    writeSwarmUniforms(uniforms, timeStore.state.jdTdb - attributes.referenceJdTdb);
  }, FRAME_PRIORITY.sceneObjects);
  useSwarmFadeIn(uniforms);
  return (
    <>
      <SwarmPoints attributes={attributes} uniforms={uniforms} />
      {showTrails && <SwarmTrails attributes={attributes} uniforms={uniforms} />}
    </>
  );
}

/**
 * Timed by the wall clock from the swarm's first frame, not by the simulation clock, which may be paused or racing
 * through the opening at a month a second.
 */
function useSwarmFadeIn(uniforms: SwarmUniforms): void {
  const [clock] = useState(() => new FirstFrameClock());
  useFrame(() => {
    writeSwarmFadeIn(uniforms, swarmFadeIn(clock.secondsSinceFirstFrame(performance.now())));
  }, FRAME_PRIORITY.sceneObjects);
}

/** Starts on the first reading, so the fade begins when the swarm first draws rather than when it mounts. */
class FirstFrameClock {
  #firstMs: number | undefined;

  secondsSinceFirstFrame(nowMs: number): number {
    this.#firstMs ??= nowMs;
    return (nowMs - this.#firstMs) / 1000;
  }
}
