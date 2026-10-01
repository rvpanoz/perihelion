import { describe, expect, it } from 'vitest';
import {
  AURORA_FRAGMENT_SHADER,
  AURORA_VERTEX_SHADER,
  MAGNETOPAUSE_FRAGMENT_SHADER,
  MAGNETOPAUSE_VERTEX_SHADER,
  createImpactUniforms,
  geomagneticPoleEarthFixed,
  writeImpactUniforms,
} from './impactMaterials';
import { IMPACT_LOOK } from './impactLook';

function declaredUniforms(...shaders: string[]): string[] {
  const names = shaders.flatMap((shader) =>
    [...shader.matchAll(/^uniform \w+ (\w+);/gm)].map((match) => match[1] ?? ''),
  );
  return [...new Set(names)].toSorted();
}

describe('createImpactUniforms', () => {
  const uniforms = createImpactUniforms();

  it('gives every uniform the shaders declare', () => {
    expect(declaredUniforms(MAGNETOPAUSE_VERTEX_SHADER, MAGNETOPAUSE_FRAGMENT_SHADER)).toEqual(
      Object.keys(uniforms.magnetopause).toSorted(),
    );
    expect(declaredUniforms(AURORA_VERTEX_SHADER, AURORA_FRAGMENT_SHADER)).toEqual(
      Object.keys(uniforms.aurora).toSorted(),
    );
  });
});

describe('geomagneticPoleEarthFixed', () => {
  it('is a unit vector at 80.8° N, in the western hemisphere of the mesh frame (−east is +z)', () => {
    const pole = geomagneticPoleEarthFixed();
    expect(pole.length()).toBeCloseTo(1, 14);
    expect(Math.asin(pole.y)).toBeCloseTo(
      (IMPACT_LOOK.geomagneticPoleLatitudeDeg * Math.PI) / 180,
      14,
    );
    expect(pole.z).toBeGreaterThan(0);
  });
});

describe('writeImpactUniforms', () => {
  it('spreads the ovals and lights the magnetopause fully at the peak', () => {
    const uniforms = createImpactUniforms();
    const level = writeImpactUniforms(uniforms, {
      timing: { arrivalJdTdb: 2_461_290, strength: 1 },
      jdTdb: 2_461_290,
    });
    expect(level).toBe(1);
    expect(uniforms.aurora.impactLevel.value).toBe(1);
    expect(uniforms.aurora.ovalColatitudeRad.value).toBeCloseTo(
      (IMPACT_LOOK.stormOvalColatitudeDeg * Math.PI) / 180,
      14,
    );
    expect(uniforms.magnetopause.opacity.value).toBe(IMPACT_LOOK.magnetopausePeakOpacity);
  });
});
