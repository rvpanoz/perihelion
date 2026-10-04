import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type IUniform,
  ShaderMaterial,
  Vector2,
} from 'three';
import roundSprite from '../shaders/roundSprite.glsl?raw';
import starFragmentMain from './star.frag?raw';
import starVertexShader from './star.vert?raw';
import { STAR_LOOK } from './starLook';
import type { StarCatalog } from './starPacking';

/** The fragment shader calls `roundSpriteAlpha`, so the sprite chunk comes first. */
export const STARFIELD_FRAGMENT_SHADER = `${roundSprite}\n${starFragmentMain}`;
export { starVertexShader as STARFIELD_VERTEX_SHADER };

const APPEARANCE_FLOATS = 2;

export interface StarfieldUniforms extends Record<string, IUniform> {
  pixelRatio: IUniform<number>;
  magnitudeRange: IUniform<Vector2>;
  pointSizePx: IUniform<Vector2>;
  brightness: IUniform<Vector2>;
  colorIndexRange: IUniform<Vector2>;
  blueColor: IUniform<Color>;
  neutralColor: IUniform<Color>;
  redColor: IUniform<Color>;
}

/**
 * Positions are written on the shell rather than left as unit vectors, so three's bounding sphere matches where the
 * points are drawn and the field is culled correctly when the camera looks away from it.
 */
export function createStarfieldGeometry(catalog: StarCatalog): BufferGeometry {
  const positions = new Float32Array(catalog.count * 3);
  const appearance = new Float32Array(catalog.count * APPEARANCE_FLOATS);
  for (let star = 0; star < catalog.count; star += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      positions[star * 3 + axis] = (catalog.directions[star * 3 + axis] ?? 0) * STAR_LOOK.radiusAu;
    }
    appearance[star * APPEARANCE_FLOATS] = catalog.vmags[star] ?? 0;
    appearance[star * APPEARANCE_FLOATS + 1] = catalog.bvColors[star] ?? 0;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('appearance', new BufferAttribute(appearance, APPEARANCE_FLOATS));
  return geometry;
}

export function createStarfieldUniforms(pixelRatio: number): StarfieldUniforms {
  const { magnitudeRange, pointSizePx, brightness, colorIndexRange } = STAR_LOOK;
  return {
    pixelRatio: { value: pixelRatio },
    magnitudeRange: { value: new Vector2(magnitudeRange.brightest, magnitudeRange.faintest) },
    pointSizePx: { value: new Vector2(pointSizePx.brightest, pointSizePx.faintest) },
    brightness: { value: new Vector2(brightness.brightest, brightness.faintest) },
    colorIndexRange: { value: new Vector2(colorIndexRange.blue, colorIndexRange.red) },
    blueColor: { value: new Color(...STAR_LOOK.blueColor) },
    neutralColor: { value: new Color(...STAR_LOOK.neutralColor) },
    redColor: { value: new Color(...STAR_LOOK.redColor) },
  };
}

/** Additive and never depth-writing, like the swarm: the sky is light, not a surface. */
export function createStarfieldMaterial(uniforms: StarfieldUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: starVertexShader,
    fragmentShader: STARFIELD_FRAGMENT_SHADER,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
