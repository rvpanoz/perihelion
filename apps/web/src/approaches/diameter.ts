import type { CloseApproach } from '@perihelion/data';

/**
 * CNEOS's convention for objects without a measured size: the diameters for geometric albedos 0.25 (bright, so
 * small) and 0.05 (dark, so large). The range is always a factor √5 ≈ 2.2 wide, hence "est.".
 */
export const ALBEDO_RANGE = { bright: 0.25, dark: 0.05 } as const;
/** D = 1329 km / √p · 10^(−H/5) (Fowler & Chillemi 1992; Pravec & Harris 2007, Icarus 190, 250). */
const DIAMETER_AT_H0_UNIT_ALBEDO_KM = 1329;
const ESTIMATE_SIGNIFICANT_FIGURES = 2;
/** Enough to clear ×1000 float noise (0.0071 × 1000 = 7.1000000000000005) without rounding JPL's figure. */
const EXACT_SIGNIFICANT_FIGURES = 15;
const METRES_PER_KM = 1000;

export type DiameterFields = Pick<
  CloseApproach,
  'diameterKm' | 'diameterSigmaKm' | 'absoluteMagnitude'
>;

export interface DiameterRangeKm {
  minKm: number;
  maxKm: number;
}

export type ApproachDiameter =
  | { kind: 'jpl'; diameterKm: number; sigmaKm: number | null }
  | ({ kind: 'estimated' } & DiameterRangeKm)
  | { kind: 'unknown' };

/** A length as printed: the number shown and its unit. */
interface Length {
  value: number;
  unit: 'm' | 'km';
}

export function diameterAtAlbedoKm(absoluteMagnitude: number, albedo: number): number {
  return (DIAMETER_AT_H0_UNIT_ALBEDO_KM / Math.sqrt(albedo)) * 10 ** (-absoluteMagnitude / 5);
}

export function estimatedDiameterRangeKm(absoluteMagnitude: number): DiameterRangeKm {
  return {
    minKm: diameterAtAlbedoKm(absoluteMagnitude, ALBEDO_RANGE.bright),
    maxKm: diameterAtAlbedoKm(absoluteMagnitude, ALBEDO_RANGE.dark),
  };
}

/** A measured diameter always wins: the estimate is only a fallback for objects JPL has not sized. */
export function approachDiameter(approach: DiameterFields): ApproachDiameter {
  if (approach.diameterKm !== null) {
    return { kind: 'jpl', diameterKm: approach.diameterKm, sigmaKm: approach.diameterSigmaKm };
  }
  if (approach.absoluteMagnitude === null) return { kind: 'unknown' };
  return { kind: 'estimated', ...estimatedDiameterRangeKm(approach.absoluteMagnitude) };
}

/** The card's label says where the figure comes from, so an estimate is never read as a measurement. */
export function diameterLabel(diameter: ApproachDiameter): string {
  switch (diameter.kind) {
    case 'jpl':
      return 'Diameter (JPL)';
    case 'estimated':
      return 'Est. diameter';
    case 'unknown':
      return 'Diameter';
  }
}

/** The value alone, for the card, whose label already carries the source. */
export function diameterValueText(diameter: ApproachDiameter): string {
  switch (diameter.kind) {
    case 'jpl':
      return jplDiameterText(diameter.diameterKm, diameter.sigmaKm);
    case 'estimated':
      return rangeText(diameter);
    case 'unknown':
      return 'unknown';
  }
}

/** The list has no label column, so an estimate carries its "est." inline. */
export function diameterText(diameter: ApproachDiameter): string {
  const value = diameterValueText(diameter);
  return diameter.kind === 'estimated' ? `est. ${value}` : value;
}

/**
 * JPL's figures are facts (CONTRIBUTING.md), so never rounded: below 1 km they are rescaled exactly to metres, like the
 * estimates, and the sigma follows the value's unit so "370 ± 20 m" reads as one quantity.
 */
function jplDiameterText(diameterKm: number, sigmaKm: number | null): string {
  const unit = diameterKm < 1 ? 'm' : 'km';
  const value = exactlyIn(unit, diameterKm);
  return sigmaKm === null ? `${value} ${unit}` : `${value} ± ${exactlyIn(unit, sigmaKm)} ${unit}`;
}

/** Ends sharing a unit name it once ("16–36 m"); a range straddling 1 km names both ("700 m–1.6 km"). */
function rangeText({ minKm, maxKm }: DiameterRangeKm): string {
  const min = estimatedLength(minKm);
  const max = estimatedLength(maxKm);
  if (min.unit === max.unit) return `${min.value}–${max.value} ${max.unit}`;
  return `${min.value} ${min.unit}–${max.value} ${max.unit}`;
}

/**
 * Metres below 1 km, as CNEOS prints small objects. Rounded once, then the unit picked from the rounded value, so
 * 0.9996 km reads "1 km" rather than "1000 m".
 */
function estimatedLength(km: number): Length {
  const metres = significant(km * METRES_PER_KM, ESTIMATE_SIGNIFICANT_FIGURES);
  if (metres < METRES_PER_KM) return { value: metres, unit: 'm' };
  return { value: metres / METRES_PER_KM, unit: 'km' };
}

function exactlyIn(unit: Length['unit'], km: number): number {
  return unit === 'km' ? km : significant(km * METRES_PER_KM, EXACT_SIGNIFICANT_FIGURES);
}

/** Through Number, so 700 prints as "700" rather than toPrecision's "7.0e+2". */
function significant(value: number, figures: number): number {
  return Number(value.toPrecision(figures));
}
