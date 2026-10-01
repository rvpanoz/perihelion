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
    // The 2026-10-01 recording (CCMC) has 110 CMEs; 33 have no longitude in their flagged analysis and are
    // left out. Re-recording changes this number, so revisit it then.
    expect(cmes).toHaveLength(77);
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
          earthArrival: null,
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

describe('strict DONKI times', () => {
  const WITHOUT_ZONE = '2026-09-01T12:00';
  const RUN = {
    modelCompletionTime: '2026-09-01T20:00Z',
    estimatedShockArrivalTime: '2026-09-04T06:00Z',
  };

  it.each([
    ['startTime', { ...CME, startTime: WITHOUT_ZONE }],
    ['time21_5', { ...CME, cmeAnalyses: [{ ...ANALYSIS, time21_5: WITHOUT_ZONE }] }],
    [
      'modelCompletionTime',
      {
        ...CME,
        cmeAnalyses: [{ ...ANALYSIS, enlilList: [{ ...RUN, modelCompletionTime: WITHOUT_ZONE }] }],
      },
    ],
    [
      'estimatedShockArrivalTime',
      {
        ...CME,
        cmeAnalyses: [
          { ...ANALYSIS, enlilList: [{ ...RUN, estimatedShockArrivalTime: WITHOUT_ZONE }] },
        ],
      },
    ],
  ])('rejects a %s without an explicit Z, rather than reading it as local time', (_field, cme) => {
    expect(() => toCmes(parse([cme]))).toThrow(UpstreamFormatError);
  });

  it('ranks a submission time without Z as unreadable (oldest), not as local time', () => {
    const zoned = { ...ANALYSIS, speed: 700 };
    const zoneless = { ...ANALYSIS, submissionTime: '2026-09-05T16:15', speed: 1111 };
    const analyses = parse([{ ...CME, cmeAnalyses: [zoneless, zoned] }])[0]?.cmeAnalyses ?? [];
    expect(mostAccurateAnalysis(analyses)?.speedKmPerS).toBe(700);
  });
});

describe('CME links', () => {
  it.each(['javascript:alert(1)', '/DONKI/view/CME/1/-1', 'ftp://ccmc.gsfc.nasa.gov/x'])(
    'drops a link that is not http(s): %s',
    (link) => {
      expect(toCmes(parse([{ ...CME, link }]))[0]?.link).toBeNull();
    },
  );

  it('keeps an https link, and the schema refuses anything else', () => {
    const [cme] = toCmes(parse([CME]));
    expect(cme?.link).toBe(CME.link);
    expect(cmeSchema.safeParse({ ...cme, link: 'javascript:alert(1)' }).success).toBe(false);
  });
});

describe('ENLIL Earth arrival', () => {
  const run = (modelCompletionTime: string, estimatedShockArrivalTime: string | null) => ({
    modelCompletionTime,
    estimatedShockArrivalTime,
    isEarthGB: false,
    isEarthMinorImpact: false,
  });
  const arrivalOf = (enlilList: unknown) =>
    toCmes(parse([{ ...CME, cmeAnalyses: [{ ...ANALYSIS, enlilList }] }]))[0]?.analysis
      .earthArrival;

  it('is null with no ENLIL runs', () => {
    expect(arrivalOf(null)).toBeNull();
    expect(arrivalOf([])).toBeNull();
  });

  it('takes the latest completed run that predicts an arrival', () => {
    const earlier = run('2026-09-01T20:00Z', '2026-09-04T06:00Z');
    const later = run('2026-09-02T08:00Z', '2026-09-04T11:30Z');
    expect(arrivalOf([later, earlier])).toEqual({
      predictedTime: '2026-09-04T11:30:00.000Z',
      isGlancingBlow: false,
      isMinorImpact: false,
    });
  });

  it('skips a run with no Earth arrival even when it is the latest', () => {
    // The recording has runs like this: ENLIL reached other targets (e.g. Europa Clipper) but not Earth.
    const earthBound = run('2026-09-01T20:00Z', '2026-09-04T06:00Z');
    const elsewhere = run('2026-09-02T08:00Z', null);
    expect(arrivalOf([earthBound, elsewhere])?.predictedTime).toBe('2026-09-04T06:00:00.000Z');
    expect(arrivalOf([elsewhere])).toBeNull();
  });

  it("carries ENLIL's glancing-blow and minor-impact flags", () => {
    const glancing = {
      ...run('2026-09-01T20:00Z', '2026-09-04T06:00Z'),
      isEarthGB: true,
      isEarthMinorImpact: true,
    };
    expect(arrivalOf([glancing])).toMatchObject({ isGlancingBlow: true, isMinorImpact: true });
  });
});
