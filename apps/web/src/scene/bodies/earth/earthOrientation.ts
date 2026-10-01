import { type Vector3, earthBodyAxesEcliptic, jdUtcFromJdTdb, norm } from '@perihelion/orbit';
import type { Matrix4, Vector3 as ThreeVector3 } from 'three';
import { sceneAxesFromEcliptic } from '../../sceneFrame';

const scratchX: Vector3 = [0, 0, 0];
const scratchY: Vector3 = [0, 0, 0];
const scratchZ: Vector3 = [0, 0, 0];

/**
 * three.js's sphere puts the map's u = ½ (Greenwich) on local +x, the north pole on +y and 90° E on −z, which is
 * the scene's own mapping of a right-handed (Greenwich, 90° E, pole) frame. So the mesh's local axes are those body
 * axes in scene axes: x = Greenwich, y = pole, z = −east. UTC stands in for UT1 (< 0.9 s apart).
 */
export function writeEarthRotation(jdTdb: number, out: Matrix4): Matrix4 {
  const { greenwich, east, pole } = earthBodyAxesEcliptic(jdUtcFromJdTdb(jdTdb));
  sceneAxesFromEcliptic(greenwich, scratchX);
  sceneAxesFromEcliptic(pole, scratchY);
  sceneAxesFromEcliptic(east, scratchZ);
  return out.set(
    scratchX[0],
    scratchY[0],
    -scratchZ[0],
    0,
    scratchX[1],
    scratchY[1],
    -scratchZ[1],
    0,
    scratchX[2],
    scratchY[2],
    -scratchZ[2],
    0,
    0,
    0,
    0,
    1,
  );
}

/** Earth → Sun, unit, in scene axes: the Sun is at the heliocentric origin. */
export function writeSunDirectionFromEarth(
  earthPositionAu: Readonly<Vector3>,
  out: ThreeVector3,
): ThreeVector3 {
  const length = norm(earthPositionAu);
  sceneAxesFromEcliptic(earthPositionAu, scratchX);
  return out.set(-scratchX[0] / length, -scratchX[1] / length, -scratchX[2] / length);
}
