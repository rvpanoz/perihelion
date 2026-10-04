import { describe, expect, it } from 'vitest';
import { BODY_APPEARANCE } from '../bodies/bodyCatalog';
import markerVertexShader from './marker.vert?raw';
import { earthMarkerLook } from './markerLook';
import {
  MARKER_FRAGMENT_SHADER,
  MARKER_VERTEX_SHADER,
  createMarkerMaterial,
  createMarkerUniforms,
} from './markerMaterial';

const DECLARED_UNIFORM = /^uniform \w+ (\w+)/gm;
const PIXEL_RATIO = 2;

function declaredUniforms(shader: string): string[] {
  return [...shader.matchAll(DECLARED_UNIFORM)].map(([, name]) => name ?? '');
}

describe('marker shaders', () => {
  it.each([
    ['vertex', MARKER_VERTEX_SHADER, '<logdepthbuf_pars_vertex>'],
    ['vertex', MARKER_VERTEX_SHADER, '<logdepthbuf_vertex>'],
    ['fragment', MARKER_FRAGMENT_SHADER, '<logdepthbuf_pars_fragment>'],
    ['fragment', MARKER_FRAGMENT_SHADER, '<logdepthbuf_fragment>'],
  ])('the %s shader includes %s', (_stage, shader, chunk) => {
    expect(shader).toContain(`#include ${chunk}`);
  });

  it('draws the shared round sprite, whose chunk comes first', () => {
    expect(MARKER_FRAGMENT_SHADER).toMatch(/\broundSpriteAlpha\(gl_PointCoord/);
    expect(MARKER_FRAGMENT_SHADER.indexOf('float roundSpriteAlpha(')).toBeLessThan(
      MARKER_FRAGMENT_SHADER.indexOf('void main()'),
    );
  });

  // three.js scales `PointsMaterial.size` by the pixel ratio in the renderer; a custom material must do it itself.
  it('sizes the sprite in device pixels', () => {
    expect(markerVertexShader).toMatch(/gl_PointSize\s*=\s*sizePx\s*\*\s*pixelRatio;/);
  });

  it('supplies every uniform the shaders declare, and declares every uniform it supplies', () => {
    const declared = [
      ...declaredUniforms(MARKER_VERTEX_SHADER),
      ...declaredUniforms(MARKER_FRAGMENT_SHADER),
    ];
    const supplied = Object.keys(
      createMarkerUniforms(earthMarkerLook('earth-marker'), PIXEL_RATIO),
    );
    expect(supplied).toEqual(expect.arrayContaining(declared));
    expect(declared).toEqual(expect.arrayContaining(supplied));
  });
});

describe('createMarkerUniforms', () => {
  it('carries the look’s colour, pixel size and the canvas pixel ratio', () => {
    const look = earthMarkerLook('earth-marker');
    const uniforms = createMarkerUniforms(look, PIXEL_RATIO);
    expect(`#${uniforms.color.value.getHexString()}`).toBe(
      BODY_APPEARANCE.earthMoonBarycenter.color,
    );
    expect(uniforms.sizePx.value).toBe(look.sizePx);
    expect(uniforms.pixelRatio.value).toBe(PIXEL_RATIO);
  });

  // Alpha falls off at the rim, so the disc stays a dot rather than a glow.
  it('holds alpha across a solid core', () => {
    const { spriteCore } = createMarkerUniforms(earthMarkerLook('earth-marker'), PIXEL_RATIO);
    expect(spriteCore.value).toBeGreaterThan(0);
    expect(spriteCore.value).toBeLessThan(1);
  });
});

describe('createMarkerMaterial', () => {
  // The rim is soft, so the disc has to blend.
  it('blends', () => {
    const look = earthMarkerLook('earth-marker');
    expect(createMarkerMaterial(look, createMarkerUniforms(look, PIXEL_RATIO)).transparent).toBe(
      true,
    );
  });

  it.each([
    [true, false],
    [false, true],
  ])('with overBody %s tests and writes depth: %s', (overBody, depth) => {
    const look = { name: 'marker', color: '#ffffff', sizePx: 8, overBody };
    const material = createMarkerMaterial(look, createMarkerUniforms(look, PIXEL_RATIO));
    expect(material.depthTest).toBe(depth);
    expect(material.depthWrite).toBe(depth);
  });
});
