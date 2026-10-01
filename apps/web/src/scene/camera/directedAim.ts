import type { Vector3 } from '@perihelion/orbit';
import { writeDirectionBlend, writeUnit } from '../approach/approachCamera';

export interface DirectedFrame {
  /** `cameraRig.flightSerial`: a new value is a new flight, so the starting view is captured again. */
  flightSerial: number;
  easedProgress: number;
  /** The camera relative to the scene origin, in scene axes, as the last frame left it. */
  cameraOffset: Readonly<Vector3>;
  /** Where the flight should leave the camera: unit, from the focus toward the camera, scene axes. */
  toDirection: Readonly<Vector3>;
}

/**
 * Turns the view from wherever it was when a flight began to the flight's direction, on the flight's eased
 * progress, so starting or retargeting a flight never swings the camera in one frame.
 */
export class DirectedAim {
  #flightSerial: number | undefined;
  readonly #fromDirection: Vector3 = [0, 0, 1];

  /** Writes the unit direction from the focus to the camera, in scene axes. */
  write(frame: DirectedFrame, out: Vector3): Vector3 {
    if (frame.flightSerial !== this.#flightSerial) {
      this.#flightSerial = frame.flightSerial;
      writeUnit(frame.cameraOffset, this.#fromDirection);
    }
    const blend = {
      fromDirection: this.#fromDirection,
      toDirection: frame.toDirection,
      eased: frame.easedProgress,
    };
    return writeDirectionBlend(blend, out);
  }
}
