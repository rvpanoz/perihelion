import { z } from 'zod';
import { type Cme, type CmeAnalysis, type CmeEarthArrival, cmeLinkSchema } from '../cme';
import { readOptionalString } from './cells';
import { UpstreamFormatError } from './upstreamFormatError';

const donkiEnlilRunSchema = z.object({
  modelCompletionTime: z.string(),
  estimatedShockArrivalTime: z.string().nullable(),
  isEarthGB: z.boolean().nullable().optional(),
  isEarthMinorImpact: z.boolean().nullable().optional(),
});
type DonkiEnlilRun = z.infer<typeof donkiEnlilRunSchema>;

const donkiAnalysisSchema = z.object({
  time21_5: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  halfAngle: z.number().nullable(),
  speed: z.number().nullable(),
  type: z.string().nullable().optional(),
  isMostAccurate: z.boolean(),
  submissionTime: z.string().nullable().optional(),
  enlilList: z.array(donkiEnlilRunSchema).nullable().optional(),
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

/** A missing, zone-less or unreadable time ranks oldest; NaN from a comparator would leave the order undefined. */
function recencyMs(text: string | null | undefined): number {
  const ms = isUtcTime(text) ? Date.parse(text) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

function toCme(cme: DonkiCme): Cme[] {
  const analysis = mostAccurateAnalysis(cme.cmeAnalyses ?? []);
  if (analysis === null) return [];
  return [
    {
      activityId: cme.activityID,
      startTime: toIsoTimestamp(cme.startTime, 'startTime'),
      sourceLocation: readOptionalString(cme.sourceLocation ?? null),
      note: readOptionalString(cme.note ?? null),
      link: webLinkOrNull(cme.link ?? null),
      analysis,
    },
  ];
}

type PlaceableAnalysis = DonkiCmeAnalysis & {
  time21_5: string;
  latitude: number;
  longitude: number;
  halfAngle: number;
  speed: number;
};

/** Phase 6 needs a time, a direction, a positive width and a positive speed; cmeAnalysisSchema demands the same. */
function isPlaceable(analysis: DonkiCmeAnalysis): analysis is PlaceableAnalysis {
  return (
    analysis.time21_5 !== null &&
    analysis.latitude !== null &&
    analysis.longitude !== null &&
    analysis.halfAngle !== null &&
    analysis.halfAngle > 0 &&
    analysis.speed !== null &&
    analysis.speed > 0
  );
}

function toCmeAnalysis(analysis: DonkiCmeAnalysis): CmeAnalysis[] {
  if (!isPlaceable(analysis)) return [];
  return [
    {
      time21_5: toIsoTimestamp(analysis.time21_5, 'time21_5'),
      latitudeDeg: analysis.latitude,
      longitudeDeg: analysis.longitude,
      halfAngleDeg: analysis.halfAngle,
      speedKmPerS: analysis.speed,
      type: analysis.type ?? null,
      earthArrival: latestEarthArrival(analysis.enlilList ?? []),
    },
  ];
}

function webLinkOrNull(text: string | null): string | null {
  const link = readOptionalString(text);
  return link !== null && cmeLinkSchema.safeParse(link).success ? link : null;
}

/**
 * ENLIL may be rerun for an analysis; the most recently completed run that predicts an Earth arrival is the
 * current forecast. A run without one modelled other targets (e.g. a spacecraft) and says nothing about Earth.
 * Every run's completion time is still checked, so a malformed one fails the list like any other bad time.
 */
function latestEarthArrival(runs: readonly DonkiEnlilRun[]): CmeEarthArrival | null {
  const [latest] = runs
    .map((run) => ({
      run,
      completedMs: Date.parse(toIsoTimestamp(run.modelCompletionTime, 'modelCompletionTime')),
    }))
    .filter(({ run }) => run.estimatedShockArrivalTime !== null)
    .toSorted((a, b) => b.completedMs - a.completedMs);
  return latest === undefined ? null : toEarthArrival(latest.run);
}

function toEarthArrival(run: DonkiEnlilRun): CmeEarthArrival {
  return {
    predictedTime: toIsoTimestamp(run.estimatedShockArrivalTime ?? '', 'estimatedShockArrivalTime'),
    isGlancingBlow: run.isEarthGB ?? false,
    isMinorImpact: run.isEarthMinorImpact ?? false,
  };
}

// DONKI writes UTC with an explicit Z, at minute precision ("2026-09-01T12:00Z"). Date.parse would read a time
// without a zone as local time, so one is refused rather than silently shifted by the server's time zone.
const UTC_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

function isUtcTime(text: string | null | undefined): text is string {
  return text !== null && text !== undefined && UTC_TIME.test(text);
}

/** Normalized to full ISO so strings compare as times. */
function toIsoTimestamp(text: string, field: string): string {
  const ms = isUtcTime(text) ? Date.parse(text) : NaN;
  if (!Number.isFinite(ms))
    throw new UpstreamFormatError(`Field ${field} is not a UTC time: "${text}"`);
  return new Date(ms).toISOString();
}
