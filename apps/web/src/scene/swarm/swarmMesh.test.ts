import { describe, expect, it } from 'vitest';
import swarmVertexMain from './swarm.vert?raw';
import { SWARM_ATTRIBUTE_SIZES, buildSwarmAttributes } from './swarmAttributes';
import { SWARM_FRAGMENT_SHADER, SWARM_VERTEX_SHADER, createSwarmGeometry } from './swarmMesh';
import { J2000_JD_TDB, THREE_NEO_CATALOG } from './swarmTestSupport';
import { createSwarmUniforms } from './swarmUniforms';

const GLSL_VECTOR_TYPES: Record<number, string> = { 2: 'vec2', 3: 'vec3' };

describe('swarm shaders', () => {
  it.each(['<logdepthbuf_pars_vertex>', '<logdepthbuf_vertex>'])('vertex includes %s', (chunk) => {
    expect(SWARM_VERTEX_SHADER).toContain(`#include ${chunk}`);
  });

  it.each(['<logdepthbuf_pars_fragment>', '<logdepthbuf_fragment>'])(
    'fragment includes %s',
    (chunk) => {
      expect(SWARM_FRAGMENT_SHADER).toContain(`#include ${chunk}`);
    },
  );

  it('places each NEO with the Kepler chunk, which comes first', () => {
    expect(swarmVertexMain).toMatch(/\bswarmHeliocentricPosition\(/);
    expect(SWARM_VERTEX_SHADER.indexOf('vec3 swarmHeliocentricPosition(')).toBeLessThan(
      SWARM_VERTEX_SHADER.indexOf('void main()'),
    );
  });

  it.each(Object.keys(createSwarmUniforms(1)))('declares the uniform %s', (name) => {
    expect(swarmVertexMain).toMatch(new RegExp(`^uniform \\w+ ${name}\\b`, 'm'));
  });

  it.each(Object.entries(SWARM_ATTRIBUTE_SIZES))(
    'declares attribute %s with %i floats',
    (name, size) => {
      expect(swarmVertexMain).toContain(`attribute ${GLSL_VECTOR_TYPES[size]} ${name};`);
    },
  );
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
