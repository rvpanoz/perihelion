/**
 * Approximate planet positions from E. M. Standish, "Keplerian Elements for Approximate Positions
 * of the Major Planets" (JPL Solar System Dynamics), Table 1: mean elements and linear rates fitted
 * to the JPL ephemeris over 1800–2050 AD, heliocentric, ecliptic and equinox of J2000.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */

import { normalizeAngleRad } from './angles';
import {
  type OrbitalElements,
  type StateVector,
  createStateVector,
  stateFromElements,
} from './elements';

export const PLANETS = [
  'mercury',
  'venus',
  'earthMoonBarycenter',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;

export type Planet = (typeof PLANETS)[number];

/**
 * 1800-01-01 to 2050-01-01. Outside it accuracy degrades but nothing throws, so a scrubbed
 * timeline keeps working; callers that show facts should clamp or say so.
 */
export const STANDISH_TABLE_1_VALID_JD_TDB = { startJdTdb: 2_378_496.5, endJdTdb: 2_469_807.5 };

const J2000_JD_TDB = 2_451_545;
const DAYS_PER_JULIAN_CENTURY = 36_525;
const RAD_PER_DEG = Math.PI / 180;

type StandishElements = readonly [
  semiMajorAxisAu: number,
  eccentricity: number,
  inclinationDeg: number,
  meanLongitudeDeg: number,
  longitudeOfPerihelionDeg: number,
  longitudeOfAscendingNodeDeg: number,
];

interface StandishRow {
  atJ2000: StandishElements;
  perCentury: StandishElements;
}

/**
 * Table 1, transcribed by script from the page above to avoid copying errors. Columns: a (AU),
 * e, I, L, ϖ, Ω (degrees); rates per Julian century. "EM Bary" is the Earth–Moon barycentre.
 */
const STANDISH_TABLE_1: Readonly<Record<Planet, StandishRow>> = {
  mercury: {
    atJ2000: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    perCentury: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  },
  venus: {
    atJ2000: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    perCentury: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  },
  earthMoonBarycenter: {
    atJ2000: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    perCentury: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  },
  mars: {
    atJ2000: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    perCentury: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  },
  jupiter: {
    atJ2000: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    perCentury: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  },
  saturn: {
    atJ2000: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    perCentury: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  },
  uranus: {
    atJ2000: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    perCentury: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  },
  neptune: {
    atJ2000: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    perCentury: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  },
};

/** Mean elements at `jdTdb`, with M = L − ϖ and ω = ϖ − Ω (Standish, "Formulae for using the elements"). */
export function planetElementsAt(planet: Planet, jdTdb: number): OrbitalElements {
  const centuries = (jdTdb - J2000_JD_TDB) / DAYS_PER_JULIAN_CENTURY;
  const [
    semiMajorAxisAu,
    eccentricity,
    inclinationDeg,
    meanLongitudeDeg,
    longitudeOfPerihelionDeg,
    longitudeOfAscendingNodeDeg,
  ] = elementsAtCenturies(STANDISH_TABLE_1[planet], centuries);
  return {
    semiMajorAxisAu,
    eccentricity,
    inclinationRad: inclinationDeg * RAD_PER_DEG,
    longitudeOfAscendingNodeRad: normalizeAngleRad(longitudeOfAscendingNodeDeg * RAD_PER_DEG),
    argumentOfPerihelionRad: normalizeAngleRad(
      (longitudeOfPerihelionDeg - longitudeOfAscendingNodeDeg) * RAD_PER_DEG,
    ),
    meanAnomalyRad: normalizeAngleRad((meanLongitudeDeg - longitudeOfPerihelionDeg) * RAD_PER_DEG),
    epochJdTdb: jdTdb,
  };
}

function elementsAtCenturies(row: StandishRow, centuries: number): StandishElements {
  const { atJ2000, perCentury } = row;
  return [
    atJ2000[0] + perCentury[0] * centuries,
    atJ2000[1] + perCentury[1] * centuries,
    atJ2000[2] + perCentury[2] * centuries,
    atJ2000[3] + perCentury[3] * centuries,
    atJ2000[4] + perCentury[4] * centuries,
    atJ2000[5] + perCentury[5] * centuries,
  ];
}

/**
 * Heliocentric ecliptic J2000 state. Positions carry Table 1's accuracy; the velocity is the
 * two-body velocity of the mean elements and ignores their slow drift.
 */
export function planetStateAt(
  planet: Planet,
  jdTdb: number,
  out: StateVector = createStateVector(),
): StateVector {
  return stateFromElements(planetElementsAt(planet, jdTdb), out);
}
