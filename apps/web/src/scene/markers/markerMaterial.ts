import { Color, type IUniform, ShaderMaterial } from 'three';
import roundSprite from '../shaders/roundSprite.glsl?raw';
import markerFragmentMain from './marker.frag?raw';
import markerVertexShader from './marker.vert?raw';
import type { MarkerLook } from './markerLook';

/** The fragment shader calls `roundSpriteAlpha`, so the sprite chunk comes first. */
export const MARKER_FRAGMENT_SHADER = `${roundSprite}\n${markerFragmentMain}`;
export { markerVertexShader as MARKER_VERTEX_SHADER };

/**
 * A marker reads as a solid dot, not a glow, so alpha holds out to this share of the radius and only the rim fades.
 * The square marker it replaces was opaque to its corners; a falloff from the centre would look dimmer and smaller.
 */
const MARKER_SPRITE_CORE = 0.6;

export interface MarkerUniforms extends Record<string, IUniform> {
  color: IUniform<Color>;
  sizePx: IUniform<number>;
  pixelRatio: IUniform<number>;
  spriteCore: IUniform<number>;
}

export function createMarkerUniforms(look: MarkerLook, pixelRatio: number): MarkerUniforms {
  return {
    color: { value: new Color(look.color) },
    sizePx: { value: look.sizePx },
    pixelRatio: { value: pixelRatio },
    spriteCore: { value: MARKER_SPRITE_CORE },
  };
}

/** Blends, because the rim is soft; an over-body marker also skips the depth test, so a dark disc cannot hide it. */
export function createMarkerMaterial(look: MarkerLook, uniforms: MarkerUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: markerVertexShader,
    fragmentShader: MARKER_FRAGMENT_SHADER,
    transparent: true,
    depthTest: !look.overBody,
    depthWrite: !look.overBody,
  });
}
