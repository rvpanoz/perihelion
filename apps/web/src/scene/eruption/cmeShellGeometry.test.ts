import { type Vector3, cross, dot, norm } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type ShellShape, coneBasis, shellParticleOffsetAu } from './cmeShellGeometry';
import { CME_SHELL_LOOK } from './cmeShellLook';
import { createShellSeeds, mulberry32, shellSeedAt } from './cmeShellSeeds';

const UNIT_TOLERANCE = 1e-12;
const COUNT = CME_SHELL_LOOK.particleCount;
const seeds = createShellSeeds(COUNT, mulberry32(20_261_002));

const unitAxis = fc
  .record({
    latitudeRad: fc.double({ min: -Math.PI / 2, max: Math.PI / 2, noNaN: true }),
    longitudeRad: fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }),
  })
  .map(({ latitudeRad, longitudeRad }): Vector3 => [
    Math.cos(latitudeRad) * Math.cos(longitudeRad),
    Math.sin(latitudeRad),
    Math.cos(latitudeRad) * Math.sin(longitudeRad),
  ]);

function angleRad(first: Readonly<Vector3>, second: Readonly<Vector3>): number {
  return Math.atan2(norm(cross(first, second)), dot(first, second));
}

describe('coneBasis', () => {
  it('is orthonormal and right-handed with z on the axis, for any axis', () => {
    fc.assert(
      fc.property(unitAxis, (axis) => {
        const { x, y, z } = coneBasis(axis);
        for (const vector of [x, y, z])
          expect(Math.abs(norm(vector) - 1)).toBeLessThan(UNIT_TOLERANCE);
        expect(Math.abs(dot(x, y))).toBeLessThan(UNIT_TOLERANCE);
        expect(Math.abs(dot(x, z))).toBeLessThan(UNIT_TOLERANCE);
        expect(angleRad(z, axis)).toBeLessThan(UNIT_TOLERANCE);
        expect(angleRad(cross(x, y), z)).toBeLessThan(UNIT_TOLERANCE);
      }),
    );
  });
});

describe('shellParticleOffsetAu', () => {
  const halfAngleRad = (38 * Math.PI) / 180;
  const shape: ShellShape = {
    basis: coneBasis([0.6, 0.48, -0.64]),
    cosHalfAngle: Math.cos(halfAngleRad),
    frontDistanceAu: 0.7,
  };
  const offsets = Array.from({ length: COUNT }, (_, index) =>
    shellParticleOffsetAu(shellSeedAt(seeds, index), shape, [0, 0, 0]),
  );

  it("keeps every particle inside DONKI's cone and no farther out than the front", () => {
    const innerAu = shape.frontDistanceAu * CME_SHELL_LOOK.flankStartFraction;
    for (const offset of offsets) {
      expect(angleRad(offset, shape.basis.z)).toBeLessThanOrEqual(halfAngleRad + 1e-12);
      expect(norm(offset)).toBeLessThanOrEqual(shape.frontDistanceAu + 1e-12);
      expect(norm(offset)).toBeGreaterThanOrEqual(innerAu - 1e-12);
    }
  });

  it("fills the cone out to DONKI's half-angle", () => {
    const widestRad = Math.max(...offsets.map((offset) => angleRad(offset, shape.basis.z)));
    expect(widestRad).toBeGreaterThan(0.99 * halfAngleRad);
  });

  it('puts the leading edge at the front distance along the axis', () => {
    const seed = { capFraction: 0, azimuthRad: 0, radiusFraction: 1, brightness: 1 };
    const offset = shellParticleOffsetAu(seed, shape, [0, 0, 0]);
    for (const axis of [0, 1, 2] as const) {
      expect(offset[axis]).toBeCloseTo(shape.basis.z[axis] * shape.frontDistanceAu, 14);
    }
  });
});
