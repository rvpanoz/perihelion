import { describe, expect, it } from 'vitest';
import { cmeRowWithAnalysis } from '../test/cmeRow';
import { cmeCone, earthTag } from './cmeGeometry';

describe('cmeCone', () => {
  it('converts DONKI degrees to radians', () => {
    const cone = cmeCone({ latitudeDeg: -12, longitudeDeg: 7, halfAngleDeg: 38 });
    expect(cone.axis.latitudeRad).toBeCloseTo((-12 * Math.PI) / 180, 15);
    expect(cone.axis.longitudeRad).toBeCloseTo((7 * Math.PI) / 180, 15);
    expect(cone.halfAngleRad).toBeCloseTo((38 * Math.PI) / 180, 15);
  });
});

describe('earthTag', () => {
  it("lets ENLIL's arrival outrank a cone that misses Earth", () => {
    expect(earthTag(cmeRowWithAnalysis({ longitudeDeg: 90, halfAngleDeg: 10 }))).toBe('arrival');
  });

  it('finds Earth inside a cone aimed along the Sun–Earth line', () => {
    // Earth sits at HEEQ longitude 0 and |B0| ≤ 7.25°, so a 10° cone on the equator at longitude 0 contains it.
    const cme = cmeRowWithAnalysis({
      earthArrival: null,
      latitudeDeg: 0,
      longitudeDeg: 0,
      halfAngleDeg: 10,
    });
    expect(earthTag(cme)).toBe('insideCone');
  });

  it('finds Earth outside a narrow cone aimed at the west limb', () => {
    const cme = cmeRowWithAnalysis({ earthArrival: null, longitudeDeg: 90, halfAngleDeg: 30 });
    expect(earthTag(cme)).toBe('outsideCone');
  });
});
