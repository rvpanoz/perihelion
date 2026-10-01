import type { CloseApproach } from '@perihelion/data';

/** A plausible CAD row with an orbit, for tests that need a whole `CloseApproach`; override what the test checks. */
export function closeApproachRow(overrides: Partial<CloseApproach> = {}): CloseApproach {
  return {
    designation: '2026 RX7',
    fullName: '       (2026 RX7)',
    orbitId: '5',
    approachJdTdb: 2_461_313.675,
    approachCalendarTdb: '2026-Sep-30 04:12',
    distanceAu: 0.0123456789,
    distanceMinAu: 0.0123448,
    distanceMaxAu: 0.0123466,
    relativeVelocityKmPerS: 12.345678,
    infinityVelocityKmPerS: 12.3,
    timeUncertainty: '< 00:01',
    absoluteMagnitude: 26.1,
    diameterKm: null,
    diameterSigmaKm: null,
    orbit: {
      epochJdTdb: 2_461_200.5,
      eccentricity: 0.41,
      semiMajorAxisAu: 1.32,
      inclinationDeg: 3.2,
      longitudeOfAscendingNodeDeg: 101.5,
      argumentOfPerihelionDeg: 204.8,
      meanAnomalyDeg: 12.7,
    },
    orbitClass: 'APO',
    ...overrides,
  };
}
