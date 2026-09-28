import { z } from 'zod';
import type { Cme, CmeAnalysis } from '../cme';
import { UpstreamFormatError } from './upstreamFormatError';

const donkiAnalysisSchema = z.object({
  time21_5: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  halfAngle: z.number().nullable(),
  speed: z.number().nullable(),
  type: z.string().nullable().optional(),
  isMostAccurate: z.boolean(),
  submissionTime: z.string().nullable().optional(),
});
export type DonkiCmeAnalysis = z.infer<typeof donkiAnalysisSchema>;

const donkiCmeSchema = z.object({
  activityID: z.string(),
  startTime: z.string(),
  sourceLocation: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  cmeAnalyses: z.array(donkiAnalysisSchema).nullable().optional(),
});
type DonkiCme = z.infer<typeof donkiCmeSchema>;

/** The server's HTTP client reads an empty body as null; DONKI has answered empty windows both ways. */
export const donkiCmeResponseSchema = z
  .union([z.array(donkiCmeSchema), z.null()])
  .transform((cmes) => cmes ?? []);

export function toCmes(response: readonly DonkiCme[]): Cme[] {
  return response.flatMap(toCme).toSorted((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * DONKI can hold several analyses per CME; PLAN.md asks for the most accurate. If several are flagged,
 * the most recently submitted wins, being the newest assessment; equal submission times fall back to
 * the later time21_5. (Picking by time21_5 alone would favour the slowest estimate, which reaches
 * 21.5 solar radii last.) A CME with no complete flagged analysis is left out: Phase 6 cannot place a
 * CME without its speed, direction and width.
 */
export function mostAccurateAnalysis(analyses: readonly DonkiCmeAnalysis[]): CmeAnalysis | null {
  const [newest] = analyses
    .filter((analysis) => analysis.isMostAccurate)
    .toSorted(newestFirst)
    .flatMap(toCmeAnalysis);
  return newest ?? null;
}

function newestFirst(a: DonkiCmeAnalysis, b: DonkiCmeAnalysis): number {
  return (
    recencyMs(b.submissionTime) - recencyMs(a.submissionTime) ||
    recencyMs(b.time21_5) - recencyMs(a.time21_5)
  );
}

/** A missing or unreadable time ranks oldest; NaN from a comparator would leave the order undefined. */
function recencyMs(text: string | null | undefined): number {
  const ms = Date.parse(text ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

function toCme(cme: DonkiCme): Cme[] {
  const analysis = mostAccurateAnalysis(cme.cmeAnalyses ?? []);
  if (analysis === null) return [];
  return [
    {
      activityId: cme.activityID,
      startTime: toIsoTimestamp(cme.startTime, 'startTime'),
      sourceLocation: blankToNull(cme.sourceLocation),
      note: blankToNull(cme.note),
      link: blankToNull(cme.link),
      analysis,
    },
  ];
}

function toCmeAnalysis(analysis: DonkiCmeAnalysis): CmeAnalysis[] {
  const { time21_5, latitude, longitude, halfAngle, speed } = analysis;
  if (
    time21_5 === null ||
    latitude === null ||
    longitude === null ||
    halfAngle === null ||
    speed === null
  )
    return [];
  return [
    {
      time21_5: toIsoTimestamp(time21_5, 'time21_5'),
      latitudeDeg: latitude,
      longitudeDeg: longitude,
      halfAngleDeg: halfAngle,
      speedKmPerS: speed,
      type: analysis.type ?? null,
    },
  ];
}

/** DONKI writes minute precision ("2026-09-01T12:00Z"); normalized so strings compare as times. */
function toIsoTimestamp(text: string, field: string): string {
  const ms = Date.parse(text);
  if (!Number.isFinite(ms))
    throw new UpstreamFormatError(`Field ${field} is not a time: "${text}"`);
  return new Date(ms).toISOString();
}

function blankToNull(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}
