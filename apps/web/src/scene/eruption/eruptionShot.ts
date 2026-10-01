import type { Cme } from '@perihelion/data';
import {
  type CmeFrontMotion,
  DONKI_MEASUREMENT_DISTANCE_AU,
  SOLAR_RADIUS_AU,
  type Vector3,
  cross,
  dot,
  planetStateAt,
} from '@perihelion/orbit';
import { jdTdbFromIso } from '../../eruptions/cmeGeometry';
import { writeUnit } from '../approach/approachCamera';
import { radiusAu } from '../bodies/bodyCatalog';
import type { FlightRequest } from '../camera/cameraRig';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { cmeAxisEcliptic, cmeShellMotion, earthDistanceAu } from './cmeShellTiming';

const HOUR = 1 / 24;
const RAD_PER_DEG = Math.PI / 180;
const SCENE_NORTH: Readonly<Vector3> = [0, 1, 0];
const SCENE_X: Readonly<Vector3> = [1, 0, 0];
/** Within ~2.6° of the pole, north has no stable part across the line; scene x stands in. */
const MAX_NORTH_ALIGNMENT = 0.999;

/**
 * The eruption shot's beats, in real seconds and in camera framing. Real seconds fix each beat's playback rate, so
 * every CME plays in about the same time whatever its speed; the clock still runs on DONKI's (and ENLIL's) times.
 */
export const ERUPTION_SHOT = {
  /** The clock starts this long before the front leaves the photosphere. */
  leadDays: 1 * HOUR,
  burst: { seconds: 8, untilFrontAu: 0.15, distanceAu: 0.3, elevationDeg: 25 },
  cruise: { seconds: 12, distanceAu: 2.6, elevationDeg: 35 },
  impact: {
    seconds: 10,
    leadDays: 4 * HOUR,
    trailDays: 14 * HOUR,
    distanceEarthRadii: 30,
    elevationDeg: 20,
  },
  /** Without an ENLIL arrival the shot ends when the front is this far past Earth's distance. */
  pastEarthAu: 0.2,
  flightSeconds: 2.5,
} as const;

export type ShotBeatName = 'burst' | 'cruise' | 'impact';

export interface ShotBeat {
  name: ShotBeatName;
  startJdTdb: number;
  endJdTdb: number;
  rateDaysPerSecond: number;
  camera: FlightRequest;
}

export interface EruptionShot {
  beats: ShotBeat[];
  startJdTdb: number;
  endJdTdb: number;
}

/** When the front, moving uniformly, is at `distanceAu` from the Sun's centre. */
export function frontTimeJdTdb(motion: CmeFrontMotion, distanceAu: number): number {
  return motion.time21_5JdTdb + (distanceAu - DONKI_MEASUREMENT_DISTANCE_AU) / motion.speedAuPerDay;
}

/**
 * The burst watches the shell leave the Sun from the side of its axis; the cruise frames the Sun–Earth line from
 * above its side; with an ENLIL arrival, the impact looks at Earth across the terminator.
 */
export function eruptionShot(cme: Cme): EruptionShot {
  const motion = cmeShellMotion(cme);
  const arrival = cme.analysis.earthArrival;
  const arrivalJdTdb = arrival === null ? null : jdTdbFromIso(arrival.predictedTime);
  const burst = burstBeat(cme, motion);
  const beats =
    arrivalJdTdb === null
      ? [burst, cruiseBeat({ motion, startJdTdb: burst.endJdTdb, endJdTdb: noArrivalEnd(motion) })]
      : [burst, ...arrivalBeats({ motion, startJdTdb: burst.endJdTdb, arrivalJdTdb })];
  return {
    beats,
    startJdTdb: burst.startJdTdb,
    endJdTdb: beats.at(-1)?.endJdTdb ?? burst.endJdTdb,
  };
}

function burstBeat(cme: Cme, motion: CmeFrontMotion): ShotBeat {
  const { burst, leadDays } = ERUPTION_SHOT;
  const startJdTdb = frontTimeJdTdb(motion, SOLAR_RADIUS_AU) - leadDays;
  const axisScene = sceneAxesFromEcliptic(cmeAxisEcliptic(cme));
  return beat({
    name: 'burst',
    span: { startJdTdb, endJdTdb: frontTimeJdTdb(motion, burst.untilFrontAu) },
    seconds: burst.seconds,
    camera: {
      focus: 'sun',
      distanceAu: burst.distanceAu,
      direction: sideView(axisScene, burst.elevationDeg * RAD_PER_DEG),
    },
  });
}

function cruiseBeat(span: {
  motion: CmeFrontMotion;
  startJdTdb: number;
  endJdTdb: number;
}): ShotBeat {
  const { cruise } = ERUPTION_SHOT;
  const earthScene = sceneAxesFromEcliptic(earthPositionAu(span.endJdTdb));
  return beat({
    name: 'cruise',
    span,
    seconds: cruise.seconds,
    camera: {
      focus: 'sun',
      distanceAu: cruise.distanceAu,
      direction: sideView(earthScene, cruise.elevationDeg * RAD_PER_DEG),
    },
  });
}

function arrivalBeats(span: {
  motion: CmeFrontMotion;
  startJdTdb: number;
  arrivalJdTdb: number;
}): ShotBeat[] {
  const { impact } = ERUPTION_SHOT;
  const impactStart = Math.max(span.arrivalJdTdb - impact.leadDays, span.startJdTdb);
  const earthScene = sceneAxesFromEcliptic(earthPositionAu(span.arrivalJdTdb));
  const impactBeat = beat({
    name: 'impact',
    span: { startJdTdb: impactStart, endJdTdb: span.arrivalJdTdb + impact.trailDays },
    seconds: impact.seconds,
    camera: {
      focus: 'earthMoonBarycenter',
      distanceAu: impact.distanceEarthRadii * radiusAu('earthMoonBarycenter'),
      direction: sideView(earthScene, impact.elevationDeg * RAD_PER_DEG),
    },
  });
  return [cruiseBeat({ ...span, endJdTdb: impactStart }), impactBeat];
}

function noArrivalEnd(motion: CmeFrontMotion): number {
  const earthAtMeasurementAu = earthDistanceAu(motion.time21_5JdTdb);
  return frontTimeJdTdb(motion, earthAtMeasurementAu + ERUPTION_SHOT.pastEarthAu);
}

function beat(spec: {
  name: ShotBeatName;
  span: { startJdTdb: number; endJdTdb: number };
  seconds: number;
  camera: Omit<FlightRequest, 'durationSeconds'>;
}): ShotBeat {
  const { startJdTdb, endJdTdb } = spec.span;
  return {
    name: spec.name,
    startJdTdb,
    endJdTdb,
    rateDaysPerSecond: (endJdTdb - startJdTdb) / spec.seconds,
    camera: { ...spec.camera, durationSeconds: ERUPTION_SHOT.flightSeconds },
  };
}

function earthPositionAu(jdTdb: number): Vector3 {
  return planetStateAt('earthMoonBarycenter', jdTdb).positionAu;
}

/**
 * A view across `line` (scene axes): perpendicular to it, raised by `elevationRad` toward ecliptic north as seen
 * across the line. North is first made perpendicular to the line, so the view is square-on whatever the line's tilt.
 */
export function sideView(line: Readonly<Vector3>, elevationRad: number): Vector3 {
  const along = writeUnit(line, [0, 0, 0]);
  const reference = Math.abs(dot(SCENE_NORTH, along)) > MAX_NORTH_ALIGNMENT ? SCENE_X : SCENE_NORTH;
  const referenceAlong = dot(reference, along);
  const up = writeUnit(
    [
      reference[0] - referenceAlong * along[0],
      reference[1] - referenceAlong * along[1],
      reference[2] - referenceAlong * along[2],
    ],
    [0, 0, 0],
  );
  const side = cross(along, up);
  const cosine = Math.cos(elevationRad);
  const sine = Math.sin(elevationRad);
  return [
    side[0] * cosine + up[0] * sine,
    side[1] * cosine + up[1] * sine,
    side[2] * cosine + up[2] * sine,
  ];
}

/** The beat the clock is in, or −1 outside the shot. */
export function beatIndexAt(shot: EruptionShot, jdTdb: number): number {
  return shot.beats.findIndex(
    (candidate) => jdTdb >= candidate.startJdTdb && jdTdb < candidate.endJdTdb,
  );
}
