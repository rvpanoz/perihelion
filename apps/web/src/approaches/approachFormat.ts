import { CAD_MAX_DISTANCE_AU, type CloseApproach, type NeoOrbitClass } from '@perihelion/data';
import { KM_PER_AU, calendarFromJulianDate, jdUtcFromJdTdb } from '@perihelion/orbit';
import { SHORT_MONTHS } from '../time/shortMonths';

/**
 * One lunar distance as CNEOS defines it: "a mean semimajor axis for the moon of 384400 km"
 * (cneos.jpl.nasa.gov/glossary/LD.html). CAD reports AU only; LD and km are exact conversions of CAD's figure.
 */
export const KM_PER_LUNAR_DISTANCE = 384_400;
const LUNAR_DECIMALS = 2;
const GROUPED_KM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const MINUTES_PER_DAY = 1440;
const ORBIT_CLASS_NAMES: Record<NeoOrbitClass, string> = {
  IEO: 'Atira',
  ATE: 'Aten',
  APO: 'Apollo',
  AMO: 'Amor',
};

export interface DistanceTexts {
  au: string;
  km: string;
  lunar: string;
}

export interface ApproachGroupsRequest<A> {
  approaches: readonly A[];
  nowJdTdb: number;
}

export interface ApproachGroups<A> {
  passed: A[];
  coming: A[];
}

/** AU is CAD's own number, printed in full; km and LD are rounded for reading, never re-derived. */
export function distanceTexts(distanceAu: number): DistanceTexts {
  const distanceKm = distanceAu * KM_PER_AU;
  return {
    au: `${distanceAu} AU`,
    km: `${GROUPED_KM.format(distanceKm)} km`,
    lunar: `${(distanceKm / KM_PER_LUNAR_DISTANCE).toFixed(LUNAR_DECIMALS)} LD`,
  };
}

/** Built from the query's own cut, so the empty state cannot drift from what the server asked CAD for. */
export const NO_APPROACHES_TEXT = noApproachesText();

function noApproachesText(): string {
  const { au, lunar } = distanceTexts(CAD_MAX_DISTANCE_AU);
  return `No asteroid passes within ${au} (${lunar}) of Earth in this window.`;
}

export function speedText(kmPerS: number): string {
  return `${kmPerS} km/s`;
}

/** CAD's calendar date is TDB, not UTC (they differ by ~69 s); the label says so. */
export function approachDateText(approach: Pick<CloseApproach, 'approachCalendarTdb'>): string {
  return `${approach.approachCalendarTdb} TDB`;
}

export function approachLabel(approach: Pick<CloseApproach, 'fullName'>): string {
  return approach.fullName.trim();
}

/** Rounded to the minute before the calendar split, so 04:10:59.5 carries into 04:11 (and 23:59:40 into tomorrow). */
export function approachUtcText(approach: Pick<CloseApproach, 'approachJdTdb'>): string {
  const jdUtc = jdUtcFromJdTdb(approach.approachJdTdb);
  const { month, day, hour, minute } = calendarFromJulianDate(
    Math.round(jdUtc * MINUTES_PER_DAY) / MINUTES_PER_DAY,
  );
  return `${SHORT_MONTHS[month - 1]} ${day} · ${twoDigits(hour)}:${twoDigits(minute)} UTC`;
}

/** Linear, so the bar reads as "how far inside CAD's 0.05 AU cut". */
export function closenessFraction(distanceAu: number): number {
  return Math.min(1, Math.max(0, 1 - distanceAu / CAD_MAX_DISTANCE_AU));
}

export function orbitClassLabel(orbitClass: NeoOrbitClass | null): string {
  return orbitClass === null ? '—' : ORBIT_CLASS_NAMES[orbitClass];
}

/** Both groups keep CAD's order, which is by approach time. */
export function groupApproaches<A extends Pick<CloseApproach, 'approachJdTdb'>>({
  approaches,
  nowJdTdb,
}: ApproachGroupsRequest<A>): ApproachGroups<A> {
  return {
    passed: approaches.filter((approach) => approach.approachJdTdb < nowJdTdb),
    coming: approaches.filter((approach) => approach.approachJdTdb >= nowJdTdb),
  };
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}
