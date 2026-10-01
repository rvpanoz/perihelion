import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { IMPACT_LOOK } from './impactLook';
import { createMagnetopauseGeometry, shueRadius } from './magnetopause';

describe('shueRadius', () => {
  it('is the standoff at the subsolar point and 2^α at the terminator (Shue et al. 1998)', () => {
    expect(shueRadius(0, 0.58)).toBe(1);
    expect(shueRadius(Math.PI / 2, 0.58)).toBeCloseTo(2 ** 0.58, 14);
  });

  it('flares outward away from the Sun', () => {
    expect(shueRadius(2, 0.58)).toBeGreaterThan(shueRadius(1, 0.58));
  });
});

describe('createMagnetopauseGeometry', () => {
  const geometry = createMagnetopauseGeometry();
  const positions = geometry.getAttribute('position');
  const vertex = new Vector3();

  it('puts the nose at unit distance on +z, toward the Sun', () => {
    vertex.fromBufferAttribute(positions, 0);
    expect(vertex.x).toBeCloseTo(0, 6);
    expect(vertex.y).toBeCloseTo(0, 6);
    expect(vertex.z).toBeCloseTo(1, 6);
  });

  it('lies on the Shue surface at every vertex', () => {
    for (let index = 0; index < positions.count; index += 1) {
      vertex.fromBufferAttribute(positions, index);
      const angleRad = Math.acos(vertex.z / vertex.length());
      expect(angleRad).toBeLessThanOrEqual(IMPACT_LOOK.magnetopauseMaxAngleRad + 1e-6);
      expect(vertex.length()).toBeCloseTo(shueRadius(angleRad, IMPACT_LOOK.flaringAlpha), 5);
    }
  });
});
