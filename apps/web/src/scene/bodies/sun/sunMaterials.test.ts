import { describe, expect, it } from 'vitest';
import {
  CORONA_FRAGMENT_SHADER,
  CORONA_VERTEX_SHADER,
  SUN_SURFACE_FRAGMENT_SHADER,
  SUN_SURFACE_VERTEX_SHADER,
  advanceSunPhase,
  createSunUniforms,
} from './sunMaterials';
import { SUN_LOOK } from './sunLook';

function declaredUniforms(...shaders: string[]): string[] {
  const names = shaders.flatMap((shader) =>
    [...shader.matchAll(/^uniform \w+ (\w+);/gm)].map((match) => match[1] ?? ''),
  );
  return [...new Set(names)].toSorted();
}

describe('createSunUniforms', () => {
  const uniforms = createSunUniforms();

  it('gives every uniform the surface shaders declare', () => {
    expect(declaredUniforms(SUN_SURFACE_VERTEX_SHADER, SUN_SURFACE_FRAGMENT_SHADER)).toEqual(
      Object.keys(uniforms.surface).toSorted(),
    );
  });

  it('gives every uniform the corona shaders declare', () => {
    expect(declaredUniforms(CORONA_VERTEX_SHADER, CORONA_FRAGMENT_SHADER)).toEqual(
      Object.keys(uniforms.corona).toSorted(),
    );
  });

  it('shares one phase between the surface and the streamers', () => {
    expect(uniforms.surface.surfacePhase).toBe(uniforms.corona.surfacePhase);
  });

  it('advances the phase at the surface flow rate', () => {
    const fresh = createSunUniforms();
    advanceSunPhase(fresh.surface, 2);
    expect(fresh.corona.surfacePhase.value).toBeCloseTo(2 * SUN_LOOK.surfaceFlowPerSecond, 15);
  });

  it('prepends the noise both fragment shaders call', () => {
    for (const shader of [SUN_SURFACE_FRAGMENT_SHADER, CORONA_FRAGMENT_SHADER]) {
      expect(shader.indexOf('float snoise(vec3 v)')).toBeGreaterThanOrEqual(0);
      expect(shader.indexOf('float snoise(vec3 v)')).toBeLessThan(shader.indexOf('void main()'));
    }
  });
});
