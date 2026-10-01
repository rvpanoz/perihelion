import fc from 'fast-check';
import { Vector3 as ThreeVector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { sceneAxesFromEcliptic, sceneOrigin, setSceneOrigin, writeSceneOffset } from './sceneFrame';

const positionWithin50Au = fc.tuple(
  fc.double({ min: -50, max: 50, noNaN: true }),
  fc.double({ min: -50, max: 50, noNaN: true }),
  fc.double({ min: -50, max: 50, noNaN: true }),
);

describe('scene frame', () => {
  afterEach(() => setSceneOrigin([0, 0, 0]));

  it('puts ecliptic north on scene up and ecliptic +y on scene −z', () => {
    expect(sceneAxesFromEcliptic([0, 0, 1])).toEqual([0, 1, 0]);
    expect(sceneAxesFromEcliptic([0, 1, 0])).toEqual([0, 0, -1]);
    expect(sceneAxesFromEcliptic([1, 0, 0])).toEqual([1, 0, 0]);
  });

  it('writes into `out` when given one, even when `out` is the input', () => {
    const vector: [number, number, number] = [1, 2, 3];
    expect(sceneAxesFromEcliptic(vector, vector)).toBe(vector);
    expect(vector).toEqual([1, 3, -2]);
  });

  it('draws the origin body at exactly (0, 0, 0)', () => {
    const earthAu: [number, number, number] = [0.9833, 0.1734, -0.0000123];
    setSceneOrigin(earthAu);
    expect(writeSceneOffset(earthAu, new ThreeVector3()).length()).toBe(0);
  });

  it('keeps sub-metre precision 100 km from a focus 1 AU from the Sun', () => {
    // 100 km ≈ 6.7e-7 AU. Subtracting after a float32 cast would lose ~1e-8 AU (≈ 1.5 km) here.
    const focusAu: [number, number, number] = [0.9833, 0.1734, 0];
    const nearbyAu: [number, number, number] = [focusAu[0] + 6.7e-7, focusAu[1], focusAu[2]];
    setSceneOrigin(focusAu);
    const offsetX = writeSceneOffset(nearbyAu, new ThreeVector3()).x;
    const metrePerAu = 1 / 149_597_870_700;
    expect(Math.abs(Math.fround(offsetX) - (nearbyAu[0] - focusAu[0]))).toBeLessThan(metrePerAu);
  });

  it('writes position − origin in scene axes for any position and origin', () => {
    fc.assert(
      fc.property(positionWithin50Au, positionWithin50Au, (positionAu, originAu) => {
        setSceneOrigin(originAu);
        const offset = writeSceneOffset(positionAu, new ThreeVector3());
        const expected = sceneAxesFromEcliptic([
          positionAu[0] - originAu[0],
          positionAu[1] - originAu[1],
          positionAu[2] - originAu[2],
        ]);
        expect(offset.toArray()).toEqual(expected);
      }),
    );
  });

  it('copies the origin instead of keeping the caller’s array', () => {
    const originAu: [number, number, number] = [1, 2, 3];
    setSceneOrigin(originAu);
    originAu[0] = 99;
    expect(sceneOrigin()).toEqual([1, 2, 3]);
  });
});
