import type { CmeEarthArrival } from '@perihelion/data';
import { IMPACT_LOOK } from './impactLook';

const HOURS_PER_DAY = 24;

export interface ImpactTiming {
  arrivalJdTdb: number;
  /** 1 for a full hit; ENLIL's glancing-blow and minor-impact flags lower it. */
  strength: number;
}

export function impactStrength(
  arrival: Pick<CmeEarthArrival, 'isGlancingBlow' | 'isMinorImpact'>,
): number {
  const glancing = arrival.isGlancingBlow ? IMPACT_LOOK.glancingBlowStrength : 1;
  const minor = arrival.isMinorImpact ? IMPACT_LOOK.minorImpactStrength : 1;
  return glancing * minor;
}

/**
 * 0 → strength over the hours before ENLIL's arrival (eased), then an exponential fade; 0 once below the minimum,
 * so nothing is drawn long after the event.
 */
export function impactLevel(timing: ImpactTiming, jdTdb: number): number {
  const hoursFromArrival = (jdTdb - timing.arrivalJdTdb) * HOURS_PER_DAY;
  const level = timing.strength * impactShape(hoursFromArrival);
  return level < IMPACT_LOOK.minimumLevel ? 0 : level;
}

function impactShape(hoursFromArrival: number): number {
  const { riseHours, decayHours } = IMPACT_LOOK;
  if (hoursFromArrival >= 0) return Math.exp(-hoursFromArrival / decayHours);
  const t = Math.min(Math.max((hoursFromArrival + riseHours) / riseHours, 0), 1);
  return t * t * (3 - 2 * t);
}

/** The magnetopause's standoff and the oval's colatitude follow the impact level linearly. */
export function lerpByLevel(quiet: number, storm: number, level: number): number {
  return quiet + (storm - quiet) * Math.min(Math.max(level, 0), 1);
}
