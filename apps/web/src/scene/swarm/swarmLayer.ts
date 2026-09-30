import { useEffect } from 'react';
import type { SwarmAttributes } from './swarmAttributes';
import type { SwarmUniforms } from './swarmUniforms';

/** What each drawn layer of the swarm (points, trails) shares: one attribute build and one set of uniforms. */
export interface SwarmLayerProps {
  attributes: SwarmAttributes;
  uniforms: SwarmUniforms;
}

/** three.js hit-tests points and lines within 1 world unit (1 AU here), so the swarm would swallow every click. */
export const IGNORE_RAYCAST = () => undefined;

/** GPU buffers and programs outlive their JS objects, so release them when replaced or unmounted. */
export function useDisposal(resource: { dispose(): void }): void {
  useEffect(() => () => resource.dispose(), [resource]);
}
