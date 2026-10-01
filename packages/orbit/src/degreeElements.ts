import type { OrbitalElements } from './elements';

/** SBDB gives angles in degrees; the engine works in radians. Converted here, at the I/O boundary. */
const RAD_PER_DEG = Math.PI / 180;

/** Elements as catalogues print them: the NEO catalog's columns and an approach orbit both have this shape. */
export interface DegreeElements {
  epochJdTdb: number;
  eccentricity: number;
  semiMajorAxisAu: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPerihelionDeg: number;
  meanAnomalyDeg: number;
}

export function elementsFromDegrees(orbit: DegreeElements): OrbitalElements {
  return {
    epochJdTdb: orbit.epochJdTdb,
    eccentricity: orbit.eccentricity,
    semiMajorAxisAu: orbit.semiMajorAxisAu,
    inclinationRad: orbit.inclinationDeg * RAD_PER_DEG,
    longitudeOfAscendingNodeRad: orbit.longitudeOfAscendingNodeDeg * RAD_PER_DEG,
    argumentOfPerihelionRad: orbit.argumentOfPerihelionDeg * RAD_PER_DEG,
    meanAnomalyRad: orbit.meanAnomalyDeg * RAD_PER_DEG,
  };
}
