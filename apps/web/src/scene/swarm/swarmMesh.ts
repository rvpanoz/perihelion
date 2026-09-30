import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import swarmFragmentShader from './swarm.frag?raw';
import swarmVertexMain from './swarm.vert?raw';
import {
  SWARM_ATTRIBUTE_SIZES,
  type SwarmAttributeName,
  type SwarmAttributes,
} from './swarmAttributes';
import swarmKeplerGlsl from './swarmKepler.glsl?raw';
import type { SwarmUniforms } from './swarmUniforms';

/** swarm.vert calls into the Kepler chunk, so the chunk comes first. */
export const SWARM_VERTEX_SHADER = `${swarmKeplerGlsl}\n${swarmVertexMain}`;
export const SWARM_FRAGMENT_SHADER = swarmFragmentShader;

const SWARM_ATTRIBUTE_NAMES = Object.keys(SWARM_ATTRIBUTE_SIZES) as SwarmAttributeName[];

/**
 * One vertex per NEO, drawn as gl.POINTS, so plain vertex attributes do (only trails instance). three.js takes
 * the draw count from `position`, which the shader ignores.
 */
export function createSwarmGeometry(attributes: SwarmAttributes): BufferGeometry {
  const geometry = new BufferGeometry();
  const unusedPositions = new Float32Array(attributes.count * 3);
  geometry.setAttribute('position', new BufferAttribute(unusedPositions, 3));
  for (const name of SWARM_ATTRIBUTE_NAMES) {
    geometry.setAttribute(name, new BufferAttribute(attributes[name], SWARM_ATTRIBUTE_SIZES[name]));
  }
  return geometry;
}

/** Depth-tested but not depth-writing, and additive: overlapping sprites add up instead of hiding each other. */
export function createSwarmMaterial(uniforms: SwarmUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: SWARM_VERTEX_SHADER,
    fragmentShader: SWARM_FRAGMENT_SHADER,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
