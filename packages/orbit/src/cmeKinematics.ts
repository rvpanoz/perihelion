import { KM_PER_AU } from './units';

const SECONDS_PER_DAY = 86_400;

/** Nominal solar radius, 695,700 km (IAU 2015 Resolution B3); Horizons uses the same value. */
export const SOLAR_RADIUS_AU = 695_700 / KM_PER_AU;

/**
 * DONKI measures each CME's speed and time as its front passes 21.5 R☉, the inner boundary of the WSA–ENLIL model
 * (https://ccmc.gsfc.nasa.gov/tools/DONKI/).
 */
export const DONKI_MEASUREMENT_DISTANCE_AU = 21.5 * SOLAR_RADIUS_AU;

/** DONKI's timing for one CME analysis, converted to TDB at the boundary. */
export interface CmeTiming {
  time21_5JdTdb: number;
  speedKmPerS: number;
  /** ENLIL's predicted Earth arrival, or null when there is none. */
  earthArrivalJdTdb: number | null;
}

/** The front's uniform motion: r(t) = DONKI_MEASUREMENT_DISTANCE_AU + speed × (t − time21_5). */
export interface CmeFrontMotion {
  time21_5JdTdb: number;
  speedAuPerDay: number;
}

/** Earth's heliocentric distance at a time: the engine's Earth–Moon barycentre in the app. */
export type EarthDistanceAt = (jdTdb: number) => number;

/**
 * With an ENLIL arrival, the mean transit speed that meets both DONKI times; without one, the measured speed
 * (Task 3 decisions 1 and 3).
 */
export function cmeFrontMotion(
  timing: CmeTiming,
  earthDistanceAt: EarthDistanceAt,
): CmeFrontMotion {
  if (timing.earthArrivalJdTdb === null) {
    return {
      time21_5JdTdb: timing.time21_5JdTdb,
      speedAuPerDay: auPerDayFromKmPerS(timing.speedKmPerS),
    };
  }
  return motionThroughArrival(timing.time21_5JdTdb, timing.earthArrivalJdTdb, earthDistanceAt);
}

function motionThroughArrival(
  time21_5JdTdb: number,
  arrivalJdTdb: number,
  earthDistanceAt: EarthDistanceAt,
): CmeFrontMotion {
  const transitDays = arrivalJdTdb - time21_5JdTdb;
  if (!(transitDays > 0)) {
    throw new RangeError(
      `ENLIL arrival JD ${arrivalJdTdb} is not after time21_5 JD ${time21_5JdTdb}.`,
    );
  }
  const travelAu = earthDistanceAt(arrivalJdTdb) - DONKI_MEASUREMENT_DISTANCE_AU;
  return { time21_5JdTdb, speedAuPerDay: travelAu / transitDays };
}

function auPerDayFromKmPerS(speedKmPerS: number): number {
  return (speedKmPerS * SECONDS_PER_DAY) / KM_PER_AU;
}

/**
 * The front's distance from the Sun's centre. Before `time21_5` the same motion is extrapolated back, and the front
 * is held at the photosphere (1 R☉) before launch, so the shell never starts inside the Sun.
 */
export function cmeFrontDistanceAu(motion: CmeFrontMotion, jdTdb: number): number {
  const distanceAu =
    DONKI_MEASUREMENT_DISTANCE_AU + motion.speedAuPerDay * (jdTdb - motion.time21_5JdTdb);
  return Math.max(SOLAR_RADIUS_AU, distanceAu);
}
