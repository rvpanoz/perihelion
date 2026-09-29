import type { BodyId } from '../bodies/bodyCatalog';
import type { BodyPositions } from '../bodies/bodyPositions';
import { type CameraPose, type Flight, flightProgress, writeFlightPose } from './flight';
import { defaultViewDistanceAu } from './viewDistances';

export interface FlightRequest {
  focus: BodyId;
  distanceAu?: number;
  durationSeconds?: number;
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
  #focus: BodyId = 'sun';
  #flight: Flight | undefined;
  readonly #pose: CameraPose;
  readonly #nowSeconds: () => number;
  readonly #listeners = new Set<() => void>();

  constructor(options: CameraRigOptions) {
    this.#pose = { originAu: [0, 0, 0], distanceAu: options.initialDistanceAu };
    this.#nowSeconds = options.nowSeconds ?? (() => performance.now() / 1000);
  }

  get focus(): BodyId {
    return this.#focus;
  }

  get flying(): boolean {
    return this.#flight !== undefined;
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
    this.#notify();
  }

  /** Call once per frame after body positions are updated; returns the pose to render. */
  update(frame: { bodyPositions: BodyPositions; cameraDistanceAu: number }): Readonly<CameraPose> {
    if (this.#flight) return this.#advanceFlight(this.#flight, frame.bodyPositions);
    const [x, y, z] = frame.bodyPositions[this.#focus];
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

  #advanceFlight(flight: Flight, bodyPositions: BodyPositions): Readonly<CameraPose> {
    const progress = flightProgress(flight, this.#nowSeconds());
    writeFlightPose({ flight, targetAu: bodyPositions[flight.to], progress }, this.#pose);
    if (progress === 1) this.#flight = undefined;
    return this.#pose;
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const cameraRig = new CameraRig({ initialDistanceAu: defaultViewDistanceAu('sun') });
