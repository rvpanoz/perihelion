import {
  AdditiveBlending,
  BackSide,
  Color,
  type IUniform,
  ShaderMaterial,
  type Texture,
  Vector3,
} from 'three';
import atmosphereFragmentShader from './atmosphere.frag?raw';
import atmosphereVertexShader from './atmosphere.vert?raw';
import { EARTH_LOOK } from './earthLook';
import earthSurfaceFragmentShader from './earthSurface.frag?raw';
import earthSurfaceVertexShader from './earthSurface.vert?raw';

export {
  atmosphereFragmentShader as ATMOSPHERE_FRAGMENT_SHADER,
  atmosphereVertexShader as ATMOSPHERE_VERTEX_SHADER,
  earthSurfaceFragmentShader as EARTH_SURFACE_FRAGMENT_SHADER,
  earthSurfaceVertexShader as EARTH_SURFACE_VERTEX_SHADER,
};

export interface EarthSurfaceUniforms extends Record<string, IUniform> {
  dayMap: IUniform<Texture | null>;
  sunDirection: IUniform<Vector3>;
  twilightWidth: IUniform<number>;
  dayBrightness: IUniform<number>;
  nightBrightness: IUniform<number>;
  nightTint: IUniform<Color>;
  rimColor: IUniform<Color>;
  rimPower: IUniform<number>;
}

export interface AtmosphereUniforms extends Record<string, IUniform> {
  sunDirection: IUniform<Vector3>;
  rimColor: IUniform<Color>;
  haloStrength: IUniform<number>;
}

/** One Sun direction shared by surface and halo, so one write per frame turns both. */
export function createEarthUniforms(dayMap: Texture | null): {
  surface: EarthSurfaceUniforms;
  atmosphere: AtmosphereUniforms;
} {
  const sunDirection = { value: new Vector3(1, 0, 0) };
  const rimColor = { value: new Color(...EARTH_LOOK.rimColor) };
  return {
    surface: {
      dayMap: { value: dayMap },
      sunDirection,
      twilightWidth: { value: EARTH_LOOK.twilightWidth },
      dayBrightness: { value: EARTH_LOOK.dayBrightness },
      nightBrightness: { value: EARTH_LOOK.nightBrightness },
      nightTint: { value: new Color(...EARTH_LOOK.nightTint) },
      rimColor,
      rimPower: { value: EARTH_LOOK.rimPower },
    },
    atmosphere: { sunDirection, rimColor, haloStrength: { value: EARTH_LOOK.haloStrength } },
  };
}

export function createEarthSurfaceMaterial(uniforms: EarthSurfaceUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: earthSurfaceVertexShader,
    fragmentShader: earthSurfaceFragmentShader,
  });
}

/** Back faces only, additive and never written to depth: a glow around the disc, not a surface. */
export function createAtmosphereMaterial(uniforms: AtmosphereUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
