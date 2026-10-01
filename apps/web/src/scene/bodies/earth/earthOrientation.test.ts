import { earthBodyAxesEcliptic, jdUtcFromJdTdb } from '@perihelion/orbit';
import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { sceneAxesFromEcliptic } from '../../sceneFrame';
import { writeEarthRotation, writeSunDirectionFromEarth } from './earthOrientation';

const JD_TDB = 2_461_313.75;

/** Where the sphere's map puts a longitude/latitude, before rotation (three.js SphereGeometry, u = ½ + λ/2π). */
function sphereLocalDirection(longitudeRad: number, latitudeRad: number): Vector3 {
  const phi = longitudeRad + Math.PI;
  return new Vector3(
    -Math.cos(phi) * Math.cos(latitudeRad),
    Math.sin(latitudeRad),
    Math.sin(phi) * Math.cos(latitudeRad),
  );
}

function expectSameDirection(actual: Vector3, expected: readonly number[]): void {
  expect(actual.x).toBeCloseTo(expected[0] ?? Number.NaN, 12);
  expect(actual.y).toBeCloseTo(expected[1] ?? Number.NaN, 12);
  expect(actual.z).toBeCloseTo(expected[2] ?? Number.NaN, 12);
}

describe('writeEarthRotation', () => {
  const rotation = writeEarthRotation(JD_TDB, new Matrix4());
  const axes = earthBodyAxesEcliptic(jdUtcFromJdTdb(JD_TDB));

  it('turns the map so Greenwich, 90° E and the north pole land on the body axes', () => {
    const greenwich = sphereLocalDirection(0, 0).applyMatrix4(rotation);
    expectSameDirection(greenwich, sceneAxesFromEcliptic(axes.greenwich));
    const east = sphereLocalDirection(Math.PI / 2, 0).applyMatrix4(rotation);
    expectSameDirection(east, sceneAxesFromEcliptic(axes.east));
    const north = sphereLocalDirection(0, Math.PI / 2).applyMatrix4(rotation);
    expectSameDirection(north, sceneAxesFromEcliptic(axes.pole));
  });

  it('is a pure rotation', () => {
    expect(rotation.determinant()).toBeCloseTo(1, 12);
  });
});

describe('writeSunDirectionFromEarth', () => {
  it('points from Earth back to the Sun, in scene axes, as a unit vector', () => {
    const direction = writeSunDirectionFromEarth([0.6, -0.8, 0], new Vector3());
    expectSameDirection(direction, sceneAxesFromEcliptic([-0.6, 0.8, -0]));
  });
});
