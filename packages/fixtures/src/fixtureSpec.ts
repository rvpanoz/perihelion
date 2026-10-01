/** Names match `PLANETS` in packages/orbit so golden tests can index both by the same key. */
export const PLANET_NAMES = [
  'mercury',
  'venus',
  'earthMoonBarycenter',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;
export type PlanetName = (typeof PLANET_NAMES)[number];

/** Planet-system barycentres, which is what Standish Table 1 fits (its "EM Bary" is body 3). */
export const PLANET_HORIZONS_IDS: Readonly<Record<PlanetName, string>> = {
  mercury: '1',
  venus: '2',
  earthMoonBarycenter: '3',
  mars: '4',
  jupiter: '5',
  saturn: '6',
  uranus: '7',
  neptune: '8',
};

export const ASTEROID_NAMES = [
  'eros',
  'apophis',
  'bennu',
  'ryugu',
  'phaethon',
  'aten',
  'atira',
] as const;
export type AsteroidName = (typeof ASTEROID_NAMES)[number];

/** The trailing ";" makes Horizons look the number up as a small body, not a major-body ID. */
export const ASTEROID_HORIZONS_COMMANDS: Readonly<Record<AsteroidName, string>> = {
  eros: '433;',
  apophis: '99942;',
  bennu: '101955;',
  ryugu: '162173;',
  phaethon: '3200;',
  aten: '2062;',
  atira: '163693;',
};

const J2000_JD_TDB = 2_451_545;
const UNIX_EPOCH_JD = 2_440_587.5;
const MS_PER_DAY = 86_400_000;
const STANDISH_FIRST_YEAR = 1800;
const DECADES_IN_STANDISH_RANGE = 26; // 1800, 1810, …, 2050

/** Julian Date of 0h on 1 January of `year` (proleptic Gregorian, as Date.UTC counts). */
export function julianDateOfNewYear(year: number): number {
  return Date.UTC(year, 0, 1) / MS_PER_DAY + UNIX_EPOCH_JD;
}

/** Every decade across Standish Table 1's 1800–2050 fit, plus J2000 where its elements are anchored. */
export const PLANET_SAMPLE_JD_TDB: readonly number[] = [
  ...Array.from({ length: DECADES_IN_STANDISH_RANGE }, (_, decade) =>
    julianDateOfNewYear(STANDISH_FIRST_YEAR + 10 * decade),
  ),
  J2000_JD_TDB,
].toSorted((a, b) => a - b);

/**
 * 2025-11-21, the standard epoch for published small-body osculating elements when these
 * fixtures were generated (2026-09).
 */
export const ASTEROID_EPOCH_JD_TDB = 2_461_000.5;

/** Covers PLAN.md's ±60-day target, with ±120 days of headroom for calibrating the tolerance. */
export const ASTEROID_OFFSET_DAYS = [-120, -60, -30, -10, 0, 10, 30, 60, 120] as const;

export const ASTEROID_SAMPLE_JD_TDB: readonly number[] = ASTEROID_OFFSET_DAYS.map(
  (offsetDays) => ASTEROID_EPOCH_JD_TDB + offsetDays,
);

const SUN_SAMPLE_YEAR = 2026;
const MONTHS_PER_YEAR = 12;

/**
 * 0h on the 1st of each month of 2026. Over a year Earth's heliographic latitude B0 traces the Sun's pole: its
 * amplitude is the pole's tilt and its phase the node, so a full cycle pins both.
 */
export const SUN_SAMPLE_JD_TDB: readonly number[] = Array.from(
  { length: MONTHS_PER_YEAR },
  (_, month) => Date.UTC(SUN_SAMPLE_YEAR, month, 1) / MS_PER_DAY + UNIX_EPOCH_JD,
);

/** Earth itself, not the Earth–Moon barycentre: B0 is measured from Earth's centre. */
export const EARTH_HORIZONS_ID = '399';
