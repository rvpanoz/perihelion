import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
} from 'three';
import swarmFragmentShader from './swarm.frag?raw';
import swarmVertexMain from './swarm.vert?raw';
import {
  SWARM_ATTRIBUTE_NAMES,
  SWARM_ATTRIBUTE_SIZES,
  type SwarmAttributes,
} from './swarmAttributes';
import swarmKeplerGlsl from './swarmKepler.glsl?raw';
import { SWARM_TRAIL_SAMPLES } from './swarmKepler';
import swarmTrailFragmentShader from './swarmTrails.frag?raw';
import swarmTrailVertexMain from './swarmTrails.vert?raw';
import type { SwarmUniforms } from './swarmUniforms';

/** Both vertex shaders call into the Kepler chunk, so the chunk comes first. */
export const SWARM_VERTEX_SHADER = `${swarmKeplerGlsl}\n${swarmVertexMain}`;
export const SWARM_FRAGMENT_SHADER = swarmFragmentShader;
export const SWARM_TRAIL_VERTEX_SHADER = `${swarmKeplerGlsl}\n${swarmTrailVertexMain}`;
export const SWARM_TRAIL_FRAGMENT_SHADER = swarmTrailFragmentShader;

/** The head plus one vertex per step behind it. */
export const SWARM_TRAIL_VERTEX_COUNT = SWARM_TRAIL_SAMPLES + 1;

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

/**
 * Each NEO draws the same head-to-tail strip as one instance, with its orbit as per-instance attributes. The
 * attributes wrap the same arrays the points use, so both share one reference epoch.
 */
export function createSwarmTrailGeometry(attributes: SwarmAttributes): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  const unusedPositions = new Float32Array(SWARM_TRAIL_VERTEX_COUNT * 3);
  geometry.setAttribute('position', new BufferAttribute(unusedPositions, 3));
  const trailSteps = Float32Array.from({ length: SWARM_TRAIL_VERTEX_COUNT }, (_, step) => step);
  geometry.setAttribute('trailStep', new BufferAttribute(trailSteps, 1));
  for (const name of SWARM_ATTRIBUTE_NAMES) {
    const size = SWARM_ATTRIBUTE_SIZES[name];
    geometry.setAttribute(name, new InstancedBufferAttribute(attributes[name], size));
  }
  geometry.instanceCount = attributes.count;
  return geometry;
}

export function createSwarmMaterial(uniforms: SwarmUniforms): ShaderMaterial {
  return createAdditiveMaterial(uniforms, {
    vertexShader: SWARM_VERTEX_SHADER,
    fragmentShader: SWARM_FRAGMENT_SHADER,
  });
}

/** Shares the points' uniform objects, so the one per-frame write moves both. */
export function createSwarmTrailMaterial(uniforms: SwarmUniforms): ShaderMaterial {
  return createAdditiveMaterial(uniforms, {
    vertexShader: SWARM_TRAIL_VERTEX_SHADER,
    fragmentShader: SWARM_TRAIL_FRAGMENT_SHADER,
  });
}

/** Depth-tested but not depth-writing, and additive: overlapping sprites add up instead of hiding each other. */
function createAdditiveMaterial(
  uniforms: SwarmUniforms,
  shaders: { vertexShader: string; fragmentShader: string },
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    ...shaders,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
