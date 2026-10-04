import { describe, expect, it } from 'vitest';
import { STAR_LOOK } from './starLook';
import { packStars, unpackStars } from './starPacking';
import starVertexShader from './star.vert?raw';
import {
  STARFIELD_FRAGMENT_SHADER,
  STARFIELD_VERTEX_SHADER,
  createStarfieldGeometry,
  createStarfieldUniforms,
} from './starfieldMesh';

const DECLARED_UNIFORM = /^uniform \w+ (\w+)/gm;

const TWO_STARS = unpackStars(
  packStars([
    { raDeg: 101.2871, decDeg: -16.7161, vmag: -1.46, bvColor: 0 },
    { raDeg: 37.9545, decDeg: 89.2641, vmag: 2.02, bvColor: 0.6 },
  ]).buffer as ArrayBuffer,
);

function declaredUniforms(shader: string): string[] {
  return [...shader.matchAll(DECLARED_UNIFORM)].map(([, name]) => name ?? '');
}

describe('createStarfieldGeometry', () => {
  it('puts one vertex per star on the shell, so culling sees where they are drawn', () => {
    const geometry = createStarfieldGeometry(TWO_STARS);
    const position = geometry.getAttribute('position');
    expect(position.count).toBe(TWO_STARS.count);
    expect(Math.hypot(position.getX(0), position.getY(0), position.getZ(0))).toBeCloseTo(
      STAR_LOOK.radiusAu,
      1,
    );
  });

  it('carries each star’s magnitude and colour index', () => {
    const appearance = createStarfieldGeometry(TWO_STARS).getAttribute('appearance');
    expect(appearance.itemSize).toBe(2);
    expect(appearance.getX(0)).toBeCloseTo(-1.46, 1);
    expect(appearance.getY(1)).toBeCloseTo(0.6, 1);
  });
});

describe('starfield shaders', () => {
  it.each([
    ['vertex', STARFIELD_VERTEX_SHADER, '<logdepthbuf_pars_vertex>'],
    ['vertex', STARFIELD_VERTEX_SHADER, '<logdepthbuf_vertex>'],
    ['fragment', STARFIELD_FRAGMENT_SHADER, '<logdepthbuf_pars_fragment>'],
    ['fragment', STARFIELD_FRAGMENT_SHADER, '<logdepthbuf_fragment>'],
  ])('the %s shader includes %s', (_stage, shader, chunk) => {
    expect(shader).toContain(`#include ${chunk}`);
  });

  it('draws the shared round sprite, whose chunk comes first', () => {
    expect(STARFIELD_FRAGMENT_SHADER).toMatch(/\broundSpriteAlpha\(gl_PointCoord/);
    expect(STARFIELD_FRAGMENT_SHADER.indexOf('float roundSpriteAlpha(')).toBeLessThan(
      STARFIELD_FRAGMENT_SHADER.indexOf('void main()'),
    );
  });

  it('supplies every uniform the vertex shader declares, and declares every one it supplies', () => {
    const declared = declaredUniforms(starVertexShader);
    const supplied = Object.keys(createStarfieldUniforms(1));
    expect(supplied).toEqual(expect.arrayContaining(declared));
    expect(declared).toEqual(expect.arrayContaining(supplied));
  });
});

describe('createStarfieldUniforms', () => {
  // Bloom's threshold is 1 in linear light, so a star that reached it would smear the whole sky.
  it('keeps the brightest star under the bloom threshold', () => {
    expect(STAR_LOOK.brightness.brightest).toBeLessThanOrEqual(1);
    expect(STAR_LOOK.brightness.faintest).toBeGreaterThan(0);
  });

  it('takes the canvas pixel ratio, since the sizes are in CSS pixels', () => {
    expect(createStarfieldUniforms(2).pixelRatio.value).toBe(2);
  });
});
