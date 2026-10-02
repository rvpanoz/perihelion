import type { CloseApproach, Cme } from '@perihelion/data';
import type { CameraRig } from '../scene/camera/cameraRig';
import type { FocusId } from '../scene/camera/focusPositions';
import type { TimeStore } from '../time/timeStore';

/** The `?bench=` scenarios that are timed; `tour` strings them together for the recording. */
export const MEASURED_SCENARIOS = ['overview', 'earth', 'approach', 'eruption'] as const;
export type MeasuredScenario = (typeof MEASURED_SCENARIOS)[number];
export type BenchScenario = MeasuredScenario | 'tour';
const BENCH_SCENARIOS: readonly string[] = [...MEASURED_SCENARIOS, 'tour'];

export interface BenchRequest {
  scenario: BenchScenario;
}

/** The dev-only `?bench=<scenario>`; anything else runs no bench. */
export function parseBenchRequest(search: string): BenchRequest | undefined {
  const scenario = new URLSearchParams(search).get('bench');
  return isBenchScenario(scenario) ? { scenario } : undefined;
}

function isBenchScenario(value: string | null): value is BenchScenario {
  return value !== null && BENCH_SCENARIOS.includes(value);
}

export interface BenchData {
  approaches: readonly CloseApproach[];
  cmes: readonly Cme[];
}

/** What a scenario drives: the app's stores and shot actions in the probe, fakes in tests. */
export interface BenchTargets {
  camera: Pick<CameraRig, 'flyTo'>;
  time: Pick<TimeStore, 'jumpToNow' | 'setRate' | 'setPlaying'>;
  playApproach: (approach: CloseApproach) => void;
  watchEruption: (cme: Cme) => void;
}

export interface BenchContext {
  data: BenchData;
  targets: BenchTargets;
}

/** A scenario's setup, with what it picked: the lists change weekly, so the log says which row was measured. */
export interface BenchShot {
  subject: string;
  start: () => void;
}

/** The Phase 4 and 5 runs' rate, so the baseline compares with their numbers. */
const BODY_RATE_DAYS_PER_SECOND = 1;

const SHOTS: Record<MeasuredScenario, (context: BenchContext) => BenchShot | undefined> = {
  overview: ({ targets }) => bodyShot('sun', targets),
  earth: ({ targets }) => bodyShot('earthMoonBarycenter', targets),
  approach: approachShot,
  eruption: cmeShot,
};

/** Undefined when the data has nothing for the scenario to play (an empty week). */
export function benchShot(
  scenario: MeasuredScenario,
  context: BenchContext,
): BenchShot | undefined {
  return SHOTS[scenario](context);
}

function bodyShot(focus: FocusId, targets: BenchTargets): BenchShot {
  const start = () => {
    targets.time.jumpToNow();
    targets.time.setRate(BODY_RATE_DAYS_PER_SECOND);
    targets.time.setPlaying(true);
    targets.camera.flyTo({ focus });
  };
  return { subject: focus, start };
}

function approachShot({ data, targets }: BenchContext): BenchShot | undefined {
  const approach = closestApproach(data.approaches);
  if (!approach) return undefined;
  return { subject: approach.designation, start: () => targets.playApproach(approach) };
}

function cmeShot({ data, targets }: BenchContext): BenchShot | undefined {
  const cme = benchCme(data.cmes);
  if (!cme) return undefined;
  return { subject: cme.activityId, start: () => targets.watchEruption(cme) };
}

/** The closest pass is the hardest to follow: the fastest apparent motion at the closest zoom. */
export function closestApproach(approaches: readonly CloseApproach[]): CloseApproach | undefined {
  return approaches.reduce<CloseApproach | undefined>(
    (closest, approach) =>
      closest && closest.distanceAu <= approach.distanceAu ? closest : approach,
    undefined,
  );
}

/** The latest CME with an ENLIL Earth arrival plays all three beats; without one, the latest CME. */
export function benchCme(cmes: readonly Cme[]): Cme | undefined {
  const withArrival = cmes.filter((cme) => cme.analysis.earthArrival !== null);
  return latestCme(withArrival.length > 0 ? withArrival : cmes);
}

function latestCme(cmes: readonly Cme[]): Cme | undefined {
  return cmes.reduce<Cme | undefined>(
    (latest, cme) =>
      latest && Date.parse(latest.startTime) >= Date.parse(cme.startTime) ? latest : cme,
    undefined,
  );
}

export interface TourStep {
  atSeconds: number;
  scenario: MeasuredScenario;
}

/** The recording path: an approach plays in ~14 s with its flight, an eruption's three beats in ~30 s. */
export const TOUR_STEPS: readonly TourStep[] = [
  { atSeconds: 0, scenario: 'overview' },
  { atSeconds: 8, scenario: 'earth' },
  { atSeconds: 16, scenario: 'approach' },
  { atSeconds: 32, scenario: 'eruption' },
];
export const TOUR_SECONDS = 64;

/** The steps that start in [fromSeconds, toSeconds), so a frame-by-frame walk starts each exactly once. */
export function tourStepsDue(fromSeconds: number, toSeconds: number): TourStep[] {
  return TOUR_STEPS.filter((step) => step.atSeconds >= fromSeconds && step.atSeconds < toSeconds);
}
