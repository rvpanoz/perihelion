import type { Cme } from '@perihelion/data';

/** A plausible DONKI CME with an ENLIL Earth arrival; override what the test checks. */
export function cmeRow(overrides: Partial<Cme> = {}): Cme {
  return {
    activityId: '2026-09-05T11:09:00-CME-001',
    startTime: '2026-09-05T11:09:00.000Z',
    sourceLocation: 'N12W07',
    note: null,
    link: 'https://ccmc.gsfc.nasa.gov/DONKI/view/CME/48500/-1',
    analysis: {
      time21_5: '2026-09-05T15:30:00.000Z',
      latitudeDeg: -12,
      longitudeDeg: 7,
      halfAngleDeg: 38,
      speedKmPerS: 873,
      type: 'C',
      earthArrival: {
        predictedTime: '2026-09-07T21:31:00.000Z',
        isGlancingBlow: false,
        isMinorImpact: false,
      },
      enlilRunCount: 2,
    },
    ...overrides,
  };
}

/** The same CME with its analysis changed, for the no-arrival cases. */
export function cmeRowWithAnalysis(analysis: Partial<Cme['analysis']>): Cme {
  const base = cmeRow();
  return { ...base, analysis: { ...base.analysis, ...analysis } };
}
