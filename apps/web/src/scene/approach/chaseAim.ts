import type { Vector3 } from '@perihelion/orbit';
import { DirectedAim } from '../camera/directedAim';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { writeChaseDirection } from './approachCamera';

export interface ChaseFrame {
  /** `cameraRig.flightSerial`: a new value is a new flight, so the starting view is captured again. */
  flightSerial: number;
  easedProgress: number;
  /** The camera relative to the scene origin, in scene axes, as the last frame left it. */
  cameraOffset: Readonly<Vector3>;
  /** Asteroid minus the Earth–Moon barycentre, ecliptic. */
  geocentricOffsetAu: Readonly<Vector3>;
  /** The selected pass's plane normal, ecliptic (`passNormalForApproach`). */
  passNormal: Readonly<Vector3>;
}

const scratchChase: Vector3 = [0, 0, 0];

/**
 * Turns the view from wherever it was when a chase flight began to the chase direction, on the flight's eased
 * progress, so starting or retargeting a chase never swings the camera in one frame (Review Focus 3).
 */
export class ChaseAim {
  readonly #aim = new DirectedAim();

  /** Writes the unit direction from the asteroid to the camera, in scene axes. */
  write(frame: ChaseFrame, out: Vector3): Vector3 {
    writeChaseDirection(frame.geocentricOffsetAu, frame.passNormal, scratchChase);
    sceneAxesFromEcliptic(scratchChase, scratchChase);
    return this.#aim.write({ ...frame, toDirection: scratchChase }, out);
  }
}
