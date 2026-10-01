import type { Cme, CmeAnalysis } from '@perihelion/data';
import {
  type CmeCone,
  type Vector3,
  earthHeliographicLatitudeRad,
  isEarthInsideCone,
  planetStateAt,
} from '@perihelion/orbit';
import { jdTdbFromUnixMs } from '../time/timeController';

const RAD_PER_DEG = Math.PI / 180;

export type EarthTag = 'arrival' | 'insideCone' | 'outsideCone';

/** DONKI's cone in the engine's radians (degrees only at this boundary). */
export function cmeCone(
  analysis: Pick<CmeAnalysis, 'latitudeDeg' | 'longitudeDeg' | 'halfAngleDeg'>,
): CmeCone {
  return {
    axis: {
      latitudeRad: analysis.latitudeDeg * RAD_PER_DEG,
      longitudeRad: analysis.longitudeDeg * RAD_PER_DEG,
    },
    halfAngleRad: analysis.halfAngleDeg * RAD_PER_DEG,
  };
}

export function jdTdbFromIso(isoUtc: string): number {
  return jdTdbFromUnixMs(Date.parse(isoUtc));
}

/** Earth (the Earth–Moon barycentre, as everywhere in the scene) when DONKI measured the CME. */
export function earthPositionAtMeasurementAu(analysis: Pick<CmeAnalysis, 'time21_5'>): Vector3 {
  return planetStateAt('earthMoonBarycenter', jdTdbFromIso(analysis.time21_5)).positionAu;
}

/** ENLIL's arrival outranks the cone (Task 3 decision 2); without one, DONKI's cone decides. */
export function earthTag({ analysis }: Pick<Cme, 'analysis'>): EarthTag {
  if (analysis.earthArrival !== null) return 'arrival';
  const earthLatitudeRad = earthHeliographicLatitudeRad(earthPositionAtMeasurementAu(analysis));
  return isEarthInsideCone(cmeCone(analysis), earthLatitudeRad) ? 'insideCone' : 'outsideCone';
}
