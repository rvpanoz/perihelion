import type { CloseApproach } from '@perihelion/data';
import {
  approachDateText,
  approachLabel,
  approachUtcText,
  distanceTexts,
  orbitClassLabel,
  speedText,
  twoDigits,
} from './approachFormat';
import {
  type ApproachDiameter,
  approachDiameter,
  diameterLabel,
  diameterValueText,
} from './diameter';

export interface CardStat {
  label: string;
  value: string;
  detail: string;
  tooltip?: string;
}

export interface ApproachCardModel {
  title: string;
  badge: string;
  stats: CardStat[];
  source: string;
}

/** Split so the duration can be set apart, as in the mockup: "Closest approach in **1d 13h 40m**". */
export interface CountdownParts {
  before: string;
  duration: string;
  after: string;
}

/** Distances are JPL's; the drawn pass comes from our two-body propagation, so it is labelled as illustrative. */
const SOURCE_TEXT = 'Distances from JPL CAD · drawn positions are a two-body illustration';
const GROUPED_KM_PER_H = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

/** Time-free: the countdown is the only part that changes with the clock, so it is built on its own. */
export function approachCard(approach: CloseApproach): ApproachCardModel {
  return {
    title: approachLabel(approach),
    badge: badgeText(approach.orbitClass),
    stats: [
      distanceStat(approach),
      speedStat(approach),
      diameterStat(approach),
      closestApproachStat(approach),
    ],
    source: SOURCE_TEXT,
  };
}

/**
 * `daysFromApproach` is `jdTdb − approachJdTdb`, negative before the approach. Rounded to the second before the
 * minutes are floored: two JDs near 2.46 × 10⁶ differ with ~40 µs of float noise, which must not cost a minute.
 */
export function countdownParts(daysFromApproach: number): CountdownParts {
  const seconds = Math.round(Math.abs(daysFromApproach) * SECONDS_PER_DAY);
  const totalMinutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (totalMinutes === 0) return { before: 'Closest approach now', duration: '', after: '' };
  const duration = durationText(totalMinutes);
  if (daysFromApproach < 0) return { before: 'Closest approach in', duration, after: '' };
  return { before: 'Closest approach', duration, after: 'ago' };
}

/** Every CAD row is a near-Earth object; JPL's orbit class, when known, narrows it down. */
function badgeText(orbitClass: CloseApproach['orbitClass']): string {
  return orbitClass === null ? 'NEO' : `${orbitClassLabel(orbitClass)} · NEO`;
}

function distanceStat({ distanceAu }: CloseApproach): CardStat {
  const { au, km, lunar } = distanceTexts(distanceAu);
  return { label: 'Miss distance', value: lunar, detail: `${km} · ${au}` };
}

function speedStat({ relativeVelocityKmPerS }: CloseApproach): CardStat {
  const kmPerHour = GROUPED_KM_PER_H.format(relativeVelocityKmPerS * SECONDS_PER_HOUR);
  return {
    label: 'Relative speed',
    value: speedText(relativeVelocityKmPerS),
    detail: `${kmPerHour} km/h`,
  };
}

function diameterStat(approach: CloseApproach): CardStat {
  const diameter = approachDiameter(approach);
  return {
    label: diameterLabel(diameter),
    value: diameterValueText(diameter),
    detail: diameterDetail(diameter, approach.absoluteMagnitude),
  };
}

/** An estimate cites the H it came from; a measurement cites JPL. */
function diameterDetail(diameter: ApproachDiameter, absoluteMagnitude: number | null): string {
  if (diameter.kind === 'jpl') return 'JPL';
  return absoluteMagnitude === null ? '' : `H = ${absoluteMagnitude}`;
}

/** CAD's `t_sigma_f` is a 3-sigma range, printed as CAD gives it. */
function closestApproachStat(approach: CloseApproach): CardStat {
  const { timeUncertainty } = approach;
  return {
    label: 'Closest approach',
    value: approachUtcText(approach),
    detail: timeUncertainty === null ? '' : `3σ ${timeUncertainty}`,
    tooltip: `${approachDateText(approach)} (JPL CAD)`,
  };
}

function durationText(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return `${days}d ${twoDigits(hours)}h ${twoDigits(minutes)}m`;
}
