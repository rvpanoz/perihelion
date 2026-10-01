import type { Cme } from '@perihelion/data';
import {
  type CmeFrontMotion,
  type Vector3,
  cmeFrontDistanceAu,
  cmeFrontMotion,
  heliographicToEcliptic,
  norm,
  planetStateAt,
} from '@perihelion/orbit';
import { cmeCone, earthPositionAtMeasurementAu, jdTdbFromIso } from '../../eruptions/cmeGeometry';
import { CME_SHELL_FADE } from './cmeShellLook';

export interface CmeShellState {
  frontDistanceAu: number;
  opacity: number;
}

/** Earth's heliocentric distance: the Earth–Moon barycentre, as the scene draws Earth. */
export function earthDistanceAu(jdTdb: number): number {
  return norm(planetStateAt('earthMoonBarycenter', jdTdb).positionAu);
}

/** DONKI's times as TDB; with ENLIL's arrival the front meets it at Earth (Task 3 decision 1). */
export function cmeShellMotion({ analysis }: Pick<Cme, 'analysis'>): CmeFrontMotion {
  const timing = {
    time21_5JdTdb: jdTdbFromIso(analysis.time21_5),
    speedKmPerS: analysis.speedKmPerS,
    earthArrivalJdTdb:
      analysis.earthArrival === null ? null : jdTdbFromIso(analysis.earthArrival.predictedTime),
  };
  return cmeFrontMotion(timing, earthDistanceAu);
}

/** DONKI's HEEQ frame is fixed by Earth's position when DONKI measured the CME (Task 2). */
export function cmeAxisEcliptic({ analysis }: Pick<Cme, 'analysis'>): Vector3 {
  return heliographicToEcliptic(cmeCone(analysis).axis, earthPositionAtMeasurementAu(analysis));
}

export function cmeShellState(motion: CmeFrontMotion, jdTdb: number): CmeShellState {
  const frontDistanceAu = cmeFrontDistanceAu(motion, jdTdb);
  return { frontDistanceAu, opacity: shellOpacity(frontDistanceAu) };
}

function shellOpacity(frontDistanceAu: number): number {
  const { inStartAu, inEndAu, outStartAu, outEndAu } = CME_SHELL_FADE;
  const fadeIn = smoothstep(inStartAu, inEndAu, frontDistanceAu);
  const fadeOut = 1 - smoothstep(outStartAu, outEndAu, frontDistanceAu);
  return fadeIn * fadeOut;
}

/** GLSL's smoothstep (Hermite 3t² − 2t³), so the CPU fade eases like the shaders. */
export function smoothstep(edgeStart: number, edgeEnd: number, value: number): number {
  const t = Math.min(Math.max((value - edgeStart) / (edgeEnd - edgeStart), 0), 1);
  return t * t * (3 - 2 * t);
}
