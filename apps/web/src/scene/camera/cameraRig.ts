import type { Vector3 } from '@perihelion/orbit';
import {
  type CameraPose,
  type Flight,
  easeInOutCubic,
  flightProgress,
  writeFlightPose,
} from './flight';
import type { FocusId, FocusPositions } from './focusPositions';
import { defaultViewDistanceAu } from './viewDistances';

export interface FlightRequest {
  focus: FocusId;
  distanceAu?: number;
  durationSeconds?: number;
  /** Hold the camera on the chase line (`writeChaseDirection`) until the user takes the view or another flight. */
  chase?: boolean;
  /**
   * Where to leave the camera: unit, from the focus toward the camera, scene axes. Blended in over the flight
   * (`DirectedAim`); without it the camera keeps its direction and only the focus and distance change.
   */
  direction?: Readonly<Vector3>;
}

export interface CameraRigOptions {
  initialDistanceAu: number;
  nowSeconds?: () => number;
}

export const DEFAULT_FLIGHT_SECONDS = 2.5;

/**
 * Owns the camera focus and the float64 scene origin. `update` runs every frame and never notifies; `flyTo` is a
 * user or script action and notifies, so the focus list re-renders once per change.
 */
export class CameraRig {
  #focus: FocusId = 'sun';
  #flight: Flight | undefined;
  #flightSerial = 0;
  #flightEasedProgress = 1;
  #chasing = false;
  #flightDirection: Readonly<Vector3> | undefined;
  readonly #pose: CameraPose;
  readonly #nowSeconds: () => number;
  readonly #listeners = new Set<() => void>();

  constructor(options: CameraRigOptions) {
    this.#pose = { originAu: [0, 0, 0], distanceAu: options.initialDistanceAu };
    this.#nowSeconds = options.nowSeconds ?? (() => performance.now() / 1000);
  }

  get focus(): FocusId {
    return this.#focus;
  }

  get flying(): boolean {
    return this.#flight !== undefined;
  }

  get chasing(): boolean {
    return this.#chasing;
  }

  /** Changes on every `flyTo`, so a per-frame reader can tell a new flight from the one it last saw. */
  get flightSerial(): number {
    return this.#flightSerial;
  }

  /** The last flight's requested direction; read while that flight runs, including its final frame. */
  get flightDirection(): Readonly<Vector3> | undefined {
    return this.#flightDirection;
  }

  /** The running flight's eased progress, 0 → 1; 1 when not flying. */
  get flightEasedProgress(): number {
    return this.#flight ? this.#flightEasedProgress : 1;
  }

  get pose(): Readonly<CameraPose> {
    return this.#pose;
  }

  flyTo(request: FlightRequest): void {
    this.#flight = {
      from: { originAu: [...this.#pose.originAu], distanceAu: this.#pose.distanceAu },
      to: request.focus,
      toDistanceAu: request.distanceAu ?? defaultViewDistanceAu(request.focus),
      startSeconds: this.#nowSeconds(),
      durationSeconds: request.durationSeconds ?? DEFAULT_FLIGHT_SECONDS,
    };
    this.#focus = request.focus;
    this.#chasing = request.chase ?? false;
    this.#flightDirection = request.direction;
    this.#flightSerial += 1;
    this.#flightEasedProgress = 0;
    this.#notify();
  }

  /** The user took the view (drei's `onStart`): the focus stays, only the camera's direction is freed. */
  stopChase(): void {
    if (!this.#chasing) return;
    this.#chasing = false;
    this.#notify();
  }

  /** Call once per frame after body and asteroid positions are updated; returns the pose to render. */
  update(frame: { positions: FocusPositions; cameraDistanceAu: number }): Readonly<CameraPose> {
    if (this.#flight) return this.#advanceFlight(this.#flight, frame.positions);
    const [x, y, z] = frame.positions[this.#focus];
    this.#pose.originAu[0] = x;
    this.#pose.originAu[1] = y;
    this.#pose.originAu[2] = z;
    this.#pose.distanceAu = frame.cameraDistanceAu;
    return this.#pose;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #advanceFlight(flight: Flight, positions: FocusPositions): Readonly<CameraPose> {
    const progress = flightProgress(flight, this.#nowSeconds());
    this.#flightEasedProgress = easeInOutCubic(progress);
    writeFlightPose({ flight, targetAu: positions[flight.to], progress }, this.#pose);
    if (progress === 1) this.#flight = undefined;
    return this.#pose;
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const cameraRig = new CameraRig({ initialDistanceAu: defaultViewDistanceAu('sun') });
