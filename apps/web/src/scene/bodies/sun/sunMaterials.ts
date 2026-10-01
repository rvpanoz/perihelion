import { AdditiveBlending, Color, type IUniform, ShaderMaterial, Vector3 } from 'three';
import simplexNoise3d from '../../shaders/simplexNoise3d.glsl?raw';
import { radiusAu } from '../bodyCatalog';
import coronaFragmentMain from './corona.frag?raw';
import coronaVertexShader from './corona.vert?raw';
import { SUN_LOOK } from './sunLook';
import sunSurfaceFragmentMain from './sunSurface.frag?raw';
import sunSurfaceVertexShader from './sunSurface.vert?raw';

/** Both fragment shaders call `snoise`, so the noise chunk comes first. */
export const SUN_SURFACE_FRAGMENT_SHADER = `${simplexNoise3d}\n${sunSurfaceFragmentMain}`;
export const CORONA_FRAGMENT_SHADER = `${simplexNoise3d}\n${coronaFragmentMain}`;
export {
  coronaVertexShader as CORONA_VERTEX_SHADER,
  sunSurfaceVertexShader as SUN_SURFACE_VERTEX_SHADER,
};

export interface SunSurfaceUniforms extends Record<string, IUniform> {
  surfaceColor: IUniform<Color>;
  limbDarkening: IUniform<Vector3>;
  granulationScale: IUniform<number>;
  granulationContrast: IUniform<number>;
  surfacePhase: IUniform<number>;
}

export interface CoronaUniforms extends Record<string, IUniform> {
  sunRadiusAu: IUniform<number>;
  coronaExtentRadii: IUniform<number>;
  coronaColor: IUniform<Color>;
  coronaFalloff: IUniform<number>;
  streamerContrast: IUniform<number>;
  surfacePhase: IUniform<number>;
}

/** One phase object shared by both materials, so one write per frame moves the surface and the streamers. */
export function createSunUniforms(): { surface: SunSurfaceUniforms; corona: CoronaUniforms } {
  const surfacePhase = { value: 0 };
  const [red, green, blue] = SUN_LOOK.limbDarkening;
  const [coronaRed, coronaGreen, coronaBlue] = SUN_LOOK.coronaColor;
  const [surfaceRed, surfaceGreen, surfaceBlue] = SUN_LOOK.photosphereColor;
  return {
    surface: {
      surfaceColor: { value: new Color(surfaceRed, surfaceGreen, surfaceBlue) },
      limbDarkening: { value: new Vector3(red, green, blue) },
      granulationScale: { value: SUN_LOOK.granulationScale },
      granulationContrast: { value: SUN_LOOK.granulationContrast },
      surfacePhase,
    },
    corona: {
      sunRadiusAu: { value: radiusAu('sun') },
      coronaExtentRadii: { value: SUN_LOOK.coronaExtentRadii },
      coronaColor: { value: new Color(coronaRed, coronaGreen, coronaBlue) },
      coronaFalloff: { value: SUN_LOOK.coronaFalloff },
      streamerContrast: { value: SUN_LOOK.streamerContrast },
      surfacePhase,
    },
  };
}

/** The phase is shared with the corona's uniforms, so this one write moves the surface and the streamers. */
export function advanceSunPhase(uniforms: SunSurfaceUniforms, deltaSeconds: number): void {
  uniforms.surfacePhase.value += deltaSeconds * SUN_LOOK.surfaceFlowPerSecond;
}

export function createSunSurfaceMaterial(uniforms: SunSurfaceUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: sunSurfaceVertexShader,
    fragmentShader: SUN_SURFACE_FRAGMENT_SHADER,
  });
}

/** Additive, depth-tested so the disc hides the part behind it, and never written to depth. */
export function createCoronaMaterial(uniforms: CoronaUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: coronaVertexShader,
    fragmentShader: CORONA_FRAGMENT_SHADER,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
