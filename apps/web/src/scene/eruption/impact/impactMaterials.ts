import {
  AdditiveBlending,
  Color,
  DoubleSide,
  FrontSide,
  type IUniform,
  ShaderMaterial,
  type Side,
  Vector3,
} from 'three';
import simplexNoise3d from '../../shaders/simplexNoise3d.glsl?raw';
import auroraFragmentMain from './aurora.frag?raw';
import auroraVertexShader from './aurora.vert?raw';
import { IMPACT_LOOK } from './impactLook';
import { type ImpactTiming, impactLevel, lerpByLevel } from './impactTiming';
import magnetopauseFragmentShader from './magnetopause.frag?raw';
import magnetopauseVertexShader from './magnetopause.vert?raw';

const RAD_PER_DEG = Math.PI / 180;

export const AURORA_FRAGMENT_SHADER = `${simplexNoise3d}\n${auroraFragmentMain}`;
export {
  auroraVertexShader as AURORA_VERTEX_SHADER,
  magnetopauseFragmentShader as MAGNETOPAUSE_FRAGMENT_SHADER,
  magnetopauseVertexShader as MAGNETOPAUSE_VERTEX_SHADER,
};

export interface MagnetopauseUniforms extends Record<string, IUniform> {
  magnetopauseColor: IUniform<Color>;
  opacity: IUniform<number>;
  tailFadeCosine: IUniform<number>;
}

export interface AuroraUniforms extends Record<string, IUniform> {
  geomagneticPole: IUniform<Vector3>;
  sunDirection: IUniform<Vector3>;
  ovalColatitudeRad: IUniform<number>;
  ovalWidthRad: IUniform<number>;
  impactLevel: IUniform<number>;
  flickerPhase: IUniform<number>;
  auroraColor: IUniform<Color>;
}

export interface ImpactUniforms {
  magnetopause: MagnetopauseUniforms;
  aurora: AuroraUniforms;
}

/** The geomagnetic pole in the Earth-fixed mesh frame (x Greenwich, y north, z = −east; see earthOrientation.ts). */
export function geomagneticPoleEarthFixed(): Vector3 {
  const latitudeRad = IMPACT_LOOK.geomagneticPoleLatitudeDeg * RAD_PER_DEG;
  const longitudeRad = IMPACT_LOOK.geomagneticPoleLongitudeDeg * RAD_PER_DEG;
  return new Vector3(
    Math.cos(latitudeRad) * Math.cos(longitudeRad),
    Math.sin(latitudeRad),
    -Math.cos(latitudeRad) * Math.sin(longitudeRad),
  );
}

export function createImpactUniforms(): ImpactUniforms {
  return {
    magnetopause: {
      magnetopauseColor: { value: new Color(...IMPACT_LOOK.magnetopauseColor) },
      opacity: { value: IMPACT_LOOK.magnetopauseBaseOpacity },
      tailFadeCosine: { value: Math.cos(IMPACT_LOOK.magnetopauseMaxAngleRad) },
    },
    aurora: {
      geomagneticPole: { value: geomagneticPoleEarthFixed() },
      sunDirection: { value: new Vector3(1, 0, 0) },
      ovalColatitudeRad: { value: IMPACT_LOOK.quietOvalColatitudeDeg * RAD_PER_DEG },
      ovalWidthRad: { value: IMPACT_LOOK.ovalWidthDeg * RAD_PER_DEG },
      impactLevel: { value: 0 },
      flickerPhase: { value: 0 },
      auroraColor: { value: new Color(...IMPACT_LOOK.auroraColor) },
    },
  };
}

/** Per frame: the level drives the aurora's brightness and spread and the magnetopause's glow; returns the level. */
export function writeImpactUniforms(
  uniforms: ImpactUniforms,
  frame: { timing: ImpactTiming; jdTdb: number },
): number {
  const level = impactLevel(frame.timing, frame.jdTdb);
  const { quietOvalColatitudeDeg, stormOvalColatitudeDeg } = IMPACT_LOOK;
  const { magnetopauseBaseOpacity, magnetopausePeakOpacity } = IMPACT_LOOK;
  uniforms.aurora.impactLevel.value = level;
  uniforms.aurora.ovalColatitudeRad.value =
    lerpByLevel(quietOvalColatitudeDeg, stormOvalColatitudeDeg, level) * RAD_PER_DEG;
  uniforms.magnetopause.opacity.value = lerpByLevel(
    magnetopauseBaseOpacity,
    magnetopausePeakOpacity,
    level,
  );
  return level;
}

export function advanceAuroraFlicker(uniforms: AuroraUniforms, deltaSeconds: number): void {
  uniforms.flickerPhase.value += deltaSeconds * IMPACT_LOOK.flickerPerSecond;
}

/**
 * Both are glows: additive, depth-tested so Earth hides what is behind it, never written to depth. The magnetopause
 * shows both faces (a see-through bubble), the aurora only the outward one.
 */
export function createMagnetopauseMaterial(uniforms: MagnetopauseUniforms): ShaderMaterial {
  return glowMaterial(uniforms, {
    vertexShader: magnetopauseVertexShader,
    fragmentShader: magnetopauseFragmentShader,
    side: DoubleSide,
  });
}

export function createAuroraMaterial(uniforms: AuroraUniforms): ShaderMaterial {
  return glowMaterial(uniforms, {
    vertexShader: auroraVertexShader,
    fragmentShader: AURORA_FRAGMENT_SHADER,
    side: FrontSide,
  });
}

function glowMaterial(
  uniforms: Record<string, IUniform>,
  shaders: { vertexShader: string; fragmentShader: string; side: Side },
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    ...shaders,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
