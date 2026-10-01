import { RECORDED_CAD_WINDOW } from '@perihelion/fixtures/upstream';
import { jplColumnarResponseSchema, toCloseApproaches } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import { closeApproachRow } from '../test/closeApproachRow';
import {
  type ApproachCardModel,
  type CardStat,
  approachCard,
  countdownParts,
} from './approachCardModel';
import { approachDiameter, diameterLabel, diameterValueText } from './diameter';

function statLabelled(card: ApproachCardModel, label: string): CardStat {
  const stat = card.stats.find((candidate) => candidate.label === label);
  if (stat === undefined) throw new Error(`No "${label}" stat`);
  return stat;
}

describe('approachCard', () => {
  const row = closeApproachRow();
  const card = approachCard(row);

  it('titles the card with the trimmed name and badges its orbit class', () => {
    expect(card.title).toBe('(2026 RX7)');
    expect(card.badge).toBe('Apollo · NEO');
  });

  it('badges a row without an orbit class as just a NEO', () => {
    expect(approachCard(closeApproachRow({ orbitClass: null })).badge).toBe('NEO');
  });

  it('shows the miss distance in LD, with km and CAD’s AU beneath', () => {
    expect(statLabelled(card, 'Miss distance')).toEqual({
      label: 'Miss distance',
      value: '4.80 LD',
      detail: '1,846,887 km · 0.0123456789 AU',
    });
  });

  it('shows CAD’s relative speed, with km/h beneath', () => {
    expect(statLabelled(card, 'Relative speed')).toEqual({
      label: 'Relative speed',
      value: '12.345678 km/s',
      detail: '44,444 km/h',
    });
  });

  it('labels an estimated diameter as such and cites H', () => {
    const diameter = approachDiameter(row);
    expect(statLabelled(card, 'Est. diameter')).toEqual({
      label: diameterLabel(diameter),
      value: diameterValueText(diameter),
      detail: 'H = 26.1',
    });
  });

  it('cites JPL for a measured diameter', () => {
    const measured = approachCard(closeApproachRow({ diameterKm: 0.37, diameterSigmaKm: 0.02 }));
    expect(statLabelled(measured, 'Diameter (JPL)')).toMatchObject({
      value: '370 ± 20 m',
      detail: 'JPL',
    });
  });

  it('says the diameter is unknown when there is neither a JPL diameter nor H', () => {
    const unsized = approachCard(closeApproachRow({ absoluteMagnitude: null }));
    expect(statLabelled(unsized, 'Diameter')).toMatchObject({ value: 'unknown', detail: '' });
  });

  it('shows the closest approach in UTC, with CAD’s 3σ timing and its TDB date as the tooltip', () => {
    expect(statLabelled(card, 'Closest approach')).toEqual({
      label: 'Closest approach',
      value: 'Sep 30 · 04:11 UTC',
      detail: '3σ < 00:01',
      tooltip: '2026-Sep-30 04:12 TDB (JPL CAD)',
    });
  });

  it('leaves the timing detail empty when CAD gives no uncertainty', () => {
    const untimed = approachCard(closeApproachRow({ timeUncertainty: null }));
    expect(statLabelled(untimed, 'Closest approach').detail).toBe('');
  });

  it('says which figures are JPL’s and which are illustrative', () => {
    expect(card.source).toBe(
      'Distances from JPL CAD · drawn positions are a two-body illustration · markers not to scale',
    );
  });
});

describe('approachCard against the recorded CAD response', () => {
  const rows = toCloseApproaches(jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW));

  it.each(rows)('prints $designation’s CAD figures exactly', (cadRow) => {
    const card = approachCard(closeApproachRow(cadRow));
    expect(statLabelled(card, 'Miss distance').detail.endsWith(`${cadRow.distanceAu} AU`)).toBe(
      true,
    );
    expect(statLabelled(card, 'Relative speed').value).toBe(
      `${cadRow.relativeVelocityKmPerS} km/s`,
    );
    expect(
      statLabelled(card, 'Closest approach').tooltip?.startsWith(cadRow.approachCalendarTdb),
    ).toBe(true);
  });
});

describe('countdownParts', () => {
  it('counts down to an approach still to come', () => {
    expect(countdownParts(-1.5)).toEqual({
      before: 'Closest approach in',
      duration: '1d 12h 00m',
      after: '',
    });
  });

  it('counts up from an approach that has passed', () => {
    expect(countdownParts(0.25)).toEqual({
      before: 'Closest approach',
      duration: '0d 06h 00m',
      after: 'ago',
    });
  });

  it('says now within a minute of the approach', () => {
    expect(countdownParts(59 / 86_400)).toEqual({
      before: 'Closest approach now',
      duration: '',
      after: '',
    });
    expect(countdownParts(-59 / 86_400).before).toBe('Closest approach now');
  });

  it('rounds partial minutes down', () => {
    expect(countdownParts(-(90 + 59) / 1440).duration).toBe('0d 02h 29m');
  });

  it('does not lose a minute to the float noise of subtracting two Julian dates', () => {
    expect(countdownParts(-1.4999999998).duration).toBe('1d 12h 00m');
  });
});
