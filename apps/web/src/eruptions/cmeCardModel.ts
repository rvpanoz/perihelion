import type { Cme } from '@perihelion/data';
import type { CardStat } from '../approaches/approachCardModel';
import { arrivalText, cmeUtcText, directionText } from './cmeFormat';
import { type EarthTag, earthTag } from './cmeGeometry';

export interface CmeCardModel {
  title: string;
  subtitle: string;
  badge: string;
  stats: CardStat[];
  arrival: string;
  link: string | null;
  source: string;
}

export const EARTH_TAG_TEXT: Record<EarthTag, string> = {
  arrival: 'Earth arrival predicted',
  insideCone: 'Earth inside cone',
  outsideCone: 'Earth outside cone',
};

/**
 * Every number is DONKI's. The shell illustrates DONKI's cone model; the magnetosphere and aurora at Earth are
 * illustrations (CONTRIBUTING.md: illustrative effects are labelled in the UI).
 */
const SOURCE_TEXT =
  "NASA DONKI (CCMC) · the shell illustrates DONKI's cone model · magnetosphere and aurora are illustrative";

export function cmeCard(cme: Cme): CmeCardModel {
  const { analysis } = cme;
  return {
    title: 'Coronal mass ejection',
    subtitle: cmeUtcText(cme.startTime),
    badge: EARTH_TAG_TEXT[earthTag(cme)],
    stats: [
      {
        label: 'Speed',
        value: `${analysis.speedKmPerS} km/s`,
        detail: `at 21.5 R☉ · ${cmeUtcText(analysis.time21_5)}`,
      },
      { label: 'Half-angle', value: `${analysis.halfAngleDeg}°`, detail: 'cone' },
      { label: 'Direction', value: directionText(analysis), detail: 'lat / lon (Stonyhurst)' },
    ],
    arrival: arrivalText(analysis),
    link: cme.link,
    source: SOURCE_TEXT,
  };
}
