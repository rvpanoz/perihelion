import { InstancedBufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import swarmVertexMain from './swarm.vert?raw';
import swarmTrailVertexMain from './swarmTrails.vert?raw';
import { SWARM_ATTRIBUTE_SIZES, buildSwarmAttributes } from './swarmAttributes';
import {
  SWARM_FRAGMENT_SHADER,
  SWARM_TRAIL_FRAGMENT_SHADER,
  SWARM_TRAIL_VERTEX_COUNT,
  SWARM_TRAIL_VERTEX_SHADER,
  SWARM_VERTEX_SHADER,
  createSwarmGeometry,
  createSwarmTrailGeometry,
} from './swarmMesh';
import { J2000_JD_TDB, THREE_NEO_CATALOG } from './swarmTestSupport';
import { createSwarmUniforms } from './swarmUniforms';

const GLSL_VECTOR_TYPES: Record<number, string> = { 2: 'vec2', 3: 'vec3' };
const DECLARED_UNIFORM = /^uniform \w+ (\w+)/gm;
const VERTEX_MAINS = [
  ['points', swarmVertexMain],
  ['trails', swarmTrailVertexMain],
] as const;

function declaredUniforms(shader: string): string[] {
  return [...shader.matchAll(DECLARED_UNIFORM)].map(([, name]) => name ?? '');
}

describe('swarm shaders', () => {
  it.each([
    ['points vertex', SWARM_VERTEX_SHADER, '<logdepthbuf_pars_vertex>'],
    ['points vertex', SWARM_VERTEX_SHADER, '<logdepthbuf_vertex>'],
    ['points fragment', SWARM_FRAGMENT_SHADER, '<logdepthbuf_pars_fragment>'],
    ['points fragment', SWARM_FRAGMENT_SHADER, '<logdepthbuf_fragment>'],
    ['trails vertex', SWARM_TRAIL_VERTEX_SHADER, '<logdepthbuf_pars_vertex>'],
    ['trails vertex', SWARM_TRAIL_VERTEX_SHADER, '<logdepthbuf_vertex>'],
    ['trails fragment', SWARM_TRAIL_FRAGMENT_SHADER, '<logdepthbuf_pars_fragment>'],
    ['trails fragment', SWARM_TRAIL_FRAGMENT_SHADER, '<logdepthbuf_fragment>'],
  ])('the %s shader includes %s', (_shaderName, shader, chunk) => {
    expect(shader).toContain(`#include ${chunk}`);
  });

  it('places each trail vertex behind its head with the same Kepler chunk', () => {
    expect(swarmTrailVertexMain).toMatch(/\bswarmTrailLagDays\(/);
    expect(swarmTrailVertexMain).toMatch(/\bswarmHeliocentricPosition\(/);
    expect(SWARM_TRAIL_VERTEX_SHADER.indexOf('float swarmTrailLagDays(')).toBeLessThan(
      SWARM_TRAIL_VERTEX_SHADER.indexOf('void main()'),
    );
  });

  it('places each NEO with the Kepler chunk, which comes first', () => {
    expect(swarmVertexMain).toMatch(/\bswarmHeliocentricPosition\(/);
    expect(SWARM_VERTEX_SHADER.indexOf('vec3 swarmHeliocentricPosition(')).toBeLessThan(
      SWARM_VERTEX_SHADER.indexOf('void main()'),
    );
  });

  it.each(VERTEX_MAINS)('supplies every uniform the %s shader declares', (_shaderName, shader) => {
    expect(Object.keys(createSwarmUniforms(1))).toEqual(
      expect.arrayContaining(declaredUniforms(shader)),
    );
  });

  it.each(Object.keys(createSwarmUniforms(1)))('declares the uniform %s in a shader', (name) => {
    const declared = VERTEX_MAINS.flatMap(([, shader]) => declaredUniforms(shader));
    expect(declared).toContain(name);
  });

  it.each(
    VERTEX_MAINS.flatMap(([shaderName, shader]) =>
      Object.entries(SWARM_ATTRIBUTE_SIZES).map(([name, size]) => [shaderName, name, size, shader]),
    ),
  )('the %s shader declares attribute %s with %i floats', (_shaderName, name, size, shader) => {
    expect(shader).toContain(`attribute ${GLSL_VECTOR_TYPES[Number(size)]} ${name};`);
  });
});

describe('createSwarmGeometry', () => {
  it('has one vertex per NEO and every swarm attribute at its size', () => {
    const geometry = createSwarmGeometry(buildSwarmAttributes(THREE_NEO_CATALOG, J2000_JD_TDB));
    expect(geometry.getAttribute('position').count).toBe(3);
    for (const [name, size] of Object.entries(SWARM_ATTRIBUTE_SIZES)) {
      expect(geometry.getAttribute(name).itemSize).toBe(size);
      expect(geometry.getAttribute(name).count).toBe(3);
    }
  });
});

describe('createSwarmTrailGeometry', () => {
  const geometry = createSwarmTrailGeometry(buildSwarmAttributes(THREE_NEO_CATALOG, J2000_JD_TDB));

  it('is a head-to-tail strip of trail steps', () => {
    expect(geometry.getAttribute('position').count).toBe(SWARM_TRAIL_VERTEX_COUNT);
    expect(Array.from(geometry.getAttribute('trailStep').array)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it('draws one instance per NEO with every swarm attribute at its size', () => {
    expect(geometry.instanceCount).toBe(3);
    for (const [name, size] of Object.entries(SWARM_ATTRIBUTE_SIZES)) {
      const attribute = geometry.getAttribute(name);
      expect(attribute).toBeInstanceOf(InstancedBufferAttribute);
      expect(attribute.itemSize).toBe(size);
      expect(attribute.count).toBe(3);
    }
  });
});
