import type { CmeAnalysis } from '@perihelion/data';
import { twoDigits } from '../approaches/approachFormat';
import { SHORT_MONTHS } from '../time/shortMonths';

/** DONKI prints UTC to the minute ("2026-09-02T00:08Z"), so nothing is rounded: "Sep 2 · 00:08 UTC". */
export function cmeUtcText(isoUtc: string): string {
  const date = new Date(isoUtc);
  const time = `${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}`;
  return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()} · ${time} UTC`;
}

/**
 * Stonyhurst latitude/longitude as solar physicists write a source location, "S12 W07". DONKI's longitude is
 * positive toward solar west (Task 2), so a positive value is W. The sign is read after rounding, so −0.4 is "N00".
 */
export function directionText({
  latitudeDeg,
  longitudeDeg,
}: Pick<CmeAnalysis, 'latitudeDeg' | 'longitudeDeg'>): string {
  return `${hemisphereText(latitudeDeg, 'N', 'S')} ${hemisphereText(longitudeDeg, 'W', 'E')}`;
}

function hemisphereText(degrees: number, positive: string, negative: string): string {
  const rounded = Math.round(degrees);
  const letter = rounded >= 0 ? positive : negative;
  return `${letter}${twoDigits(Math.abs(rounded))}`;
}

/**
 * ENLIL's arrival is DONKI's forecast, shown as such. Without one, the text says whether ENLIL ran and predicted
 * none or never ran (Task 3 decision 3); no arrival of our own is ever shown.
 */
export function arrivalText(analysis: Pick<CmeAnalysis, 'earthArrival' | 'enlilRunCount'>): string {
  const { earthArrival } = analysis;
  if (earthArrival === null) {
    return analysis.enlilRunCount > 0
      ? 'ENLIL: no Earth arrival predicted'
      : 'No ENLIL run for this CME';
  }
  const flags = [
    earthArrival.isGlancingBlow ? 'glancing blow' : '',
    earthArrival.isMinorImpact ? 'minor impact' : '',
  ].filter((flag) => flag !== '');
  const base = `ENLIL predicts Earth arrival ${cmeUtcText(earthArrival.predictedTime)}`;
  return flags.length === 0 ? base : `${base} · ${flags.join(' · ')}`;
}
