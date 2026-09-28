import { RECORDED_DONKI_CME_EMPTY, RECORDED_DONKI_CME_WINDOW } from '@perihelion/fixtures/upstream';
import { describe, expect, it } from 'vitest';
import { cmeSchema } from '../cme';
import { donkiCmeResponseSchema, mostAccurateAnalysis, toCmes } from './donki';
import { UpstreamFormatError } from './upstreamFormatError';

const ANALYSIS = {
  time21_5: '2026-09-01T18:30Z',
  latitude: -12,
  longitude: 30,
  halfAngle: 25,
  speed: 650,
  type: 'C',
  isMostAccurate: true,
  submissionTime: '2026-09-01T19:00Z',
};
const CME = {
  activityID: '2026-09-01T12:00:00-CME-001',
  startTime: '2026-09-01T12:00Z',
  sourceLocation: 'N12W30',
  note: '',
  link: 'https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/CME/1/-1',
  cmeAnalyses: [ANALYSIS],
};
const parse = (body: unknown) => donkiCmeResponseSchema.parse(body);

describe('toCmes', () => {
  it('keeps recorded CMEs that have a complete most-accurate analysis, in time order', () => {
    const cmes = toCmes(parse(RECORDED_DONKI_CME_WINDOW));
    // The 2026-09-28 recording has 126 CMEs; 40 have no longitude in their flagged analysis and are left
    // out. Re-recording changes this number, so revisit it then.
    expect(cmes).toHaveLength(86);
    for (const cme of cmes) cmeSchema.parse(cme);
    const starts = cmes.map((cme) => cme.startTime);
    expect(starts).toEqual(starts.toSorted());
  });

  it('returns no CMEs for the recorded empty window, or an empty body', () => {
    expect(toCmes(parse(RECORDED_DONKI_CME_EMPTY))).toEqual([]);
    expect(toCmes(parse(null))).toEqual([]);
  });

  it('normalizes one CME, turning DONKI minute timestamps into full ISO and blanks into null', () => {
    expect(toCmes(parse([CME]))).toEqual([
      {
        activityId: '2026-09-01T12:00:00-CME-001',
        startTime: '2026-09-01T12:00:00.000Z',
        sourceLocation: 'N12W30',
        note: null,
        link: CME.link,
        analysis: {
          time21_5: '2026-09-01T18:30:00.000Z',
          latitudeDeg: -12,
          longitudeDeg: 30,
          halfAngleDeg: 25,
          speedKmPerS: 650,
          type: 'C',
        },
      },
    ]);
  });

  it('leaves out a CME with no analyses at all', () => {
    expect(toCmes(parse([{ ...CME, cmeAnalyses: null }]))).toEqual([]);
  });

  it.each(['halfAngle', 'speed'])(
    'leaves out a CME whose flagged analysis has a zero %s',
    (field) => {
      const unplaceable = { ...ANALYSIS, [field]: 0 };
      expect(toCmes(parse([{ ...CME, cmeAnalyses: [unplaceable] }]))).toEqual([]);
    },
  );

  it('rejects an unreadable start time', () => {
    expect(() => toCmes(parse([{ ...CME, startTime: 'yesterday' }]))).toThrow(UpstreamFormatError);
  });
});

describe('mostAccurateAnalysis', () => {
  it('ignores analyses not flagged most accurate', () => {
    expect(
      mostAccurateAnalysis(
        parse([{ ...CME, cmeAnalyses: [{ ...ANALYSIS, isMostAccurate: false }] }])[0]
          ?.cmeAnalyses ?? [],
      ),
    ).toBeNull();
  });

  it('ignores a flagged analysis missing speed, direction or width', () => {
    const incomplete = { ...ANALYSIS, halfAngle: null };
    expect(
      mostAccurateAnalysis(parse([{ ...CME, cmeAnalyses: [incomplete] }])[0]?.cmeAnalyses ?? []),
    ).toBeNull();
  });

  it.each(['halfAngle', 'speed'])('ignores a flagged analysis with a zero %s', (field) => {
    const unplaceable = { ...ANALYSIS, [field]: 0 };
    expect(
      mostAccurateAnalysis(parse([{ ...CME, cmeAnalyses: [unplaceable] }])[0]?.cmeAnalyses ?? []),
    ).toBeNull();
  });

  it('falls back to an older complete analysis when the newest flagged one is incomplete', () => {
    const older = { ...ANALYSIS, speed: 892 };
    const newerIncomplete = { ...ANALYSIS, submissionTime: '2026-09-05T16:15Z', longitude: null };
    const analyses =
      parse([{ ...CME, cmeAnalyses: [older, newerIncomplete] }])[0]?.cmeAnalyses ?? [];
    expect(mostAccurateAnalysis(analyses)?.speedKmPerS).toBe(892);
  });

  it('takes the most recently submitted when several are flagged', () => {
    // Shaped like DONKI's 2026-09-05 CME: a revision four days on, with an earlier time21_5.
    const original = { ...ANALYSIS, time21_5: '2026-09-01T20:00Z', speed: 892 };
    const revision = { ...ANALYSIS, submissionTime: '2026-09-05T16:15Z', speed: 1111 };
    const analyses = parse([{ ...CME, cmeAnalyses: [original, revision] }])[0]?.cmeAnalyses ?? [];
    expect(mostAccurateAnalysis(analyses)?.speedKmPerS).toBe(1111);
  });

  it('breaks a submission-time tie with the later time21_5', () => {
    const later = { ...ANALYSIS, time21_5: '2026-09-01T20:00Z', speed: 700 };
    const analyses = parse([{ ...CME, cmeAnalyses: [ANALYSIS, later] }])[0]?.cmeAnalyses ?? [];
    expect(mostAccurateAnalysis(analyses)?.speedKmPerS).toBe(700);
  });
});
