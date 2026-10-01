import { describe, expect, it } from 'vitest';
import {
  ATMOSPHERE_FRAGMENT_SHADER,
  ATMOSPHERE_VERTEX_SHADER,
  EARTH_SURFACE_FRAGMENT_SHADER,
  EARTH_SURFACE_VERTEX_SHADER,
  createEarthUniforms,
} from './earthMaterials';

function declaredUniforms(...shaders: string[]): string[] {
  const names = shaders.flatMap((shader) =>
    [...shader.matchAll(/^uniform \w+ (\w+);/gm)].map((match) => match[1] ?? ''),
  );
  return [...new Set(names)].toSorted();
}

describe('createEarthUniforms', () => {
  const uniforms = createEarthUniforms(null);

  it('gives every uniform the surface shaders declare', () => {
    expect(declaredUniforms(EARTH_SURFACE_VERTEX_SHADER, EARTH_SURFACE_FRAGMENT_SHADER)).toEqual(
      Object.keys(uniforms.surface).toSorted(),
    );
  });

  it('gives every uniform the halo shaders declare', () => {
    expect(declaredUniforms(ATMOSPHERE_VERTEX_SHADER, ATMOSPHERE_FRAGMENT_SHADER)).toEqual(
      Object.keys(uniforms.atmosphere).toSorted(),
    );
  });

  it('shares one Sun direction between surface and halo', () => {
    expect(uniforms.surface.sunDirection).toBe(uniforms.atmosphere.sunDirection);
  });
});
