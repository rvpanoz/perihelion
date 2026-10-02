import type { DatasetOrigin } from '@perihelion/data';
import { SHORT_MONTHS } from '../time/shortMonths';

export type DataTone = 'live' | 'stale' | 'snapshot' | 'loading' | 'unavailable';

/** What the pill reads from any dataset's load state: the NEO catalog's and `useDataset`'s both fit. */
export type DatasetStatusState =
  | { status: 'loading' | 'unavailable' }
  | { status: 'ready'; origin: DatasetOrigin; fetchedAt: string };

export interface NamedDatasetState {
  label: string;
  state: DatasetStatusState;
  /** What the detail line says beyond the age, e.g. "40,123 asteroids". */
  summary?: string;
}

export interface DataStatus {
  tone: DataTone;
  text: string;
  details: string[];
}

export interface DataStatusInput {
  datasets: readonly NamedDatasetState[];
  nowMs: number;
}

/** Least to most severe: the pill reports the worst dataset, so a problem is never hidden behind a good one. */
const TONE_SEVERITY: readonly DataTone[] = ['live', 'loading', 'stale', 'snapshot', 'unavailable'];
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function dataStatus({ datasets, nowMs }: DataStatusInput): DataStatus {
  const tone = worstTone(datasets);
  return {
    tone,
    text: pillText({ datasets: datasets.filter((d) => toneOf(d.state) === tone), nowMs }, tone),
    details: datasets.map((dataset) => detailLine(dataset, nowMs)),
  };
}

function worstTone(datasets: readonly NamedDatasetState[]): DataTone {
  const severities = datasets.map((dataset) => TONE_SEVERITY.indexOf(toneOf(dataset.state)));
  return TONE_SEVERITY[Math.max(-1, ...severities)] ?? 'loading';
}

function toneOf(state: DatasetStatusState): DataTone {
  if (state.status !== 'ready') return state.status;
  return state.origin === 'fresh' ? 'live' : state.origin;
}

/** `input.datasets` holds only the datasets with the pill's tone, so the age is the oldest of those. */
function pillText({ datasets, nowMs }: DataStatusInput, tone: DataTone): string {
  if (tone === 'loading') return 'Loading JPL data…';
  if (tone === 'unavailable') return `${datasets.map((d) => d.label).join(', ')} unavailable`;
  const oldestMs = Math.min(...datasets.map((d) => fetchedAtMs(d.state)));
  if (tone === 'snapshot') return `Offline snapshot · JPL · from ${utcDateLabel(oldestMs)}`;
  const head = tone === 'live' ? 'Live' : 'Cached';
  return `${head} · JPL · updated ${ageLabel(nowMs - oldestMs)}`;
}

function detailLine({ label, state, summary }: NamedDatasetState, nowMs: number): string {
  if (state.status !== 'ready') return `${label}: ${state.status}`;
  const fetchedMs = Date.parse(state.fetchedAt);
  const served =
    state.origin === 'snapshot'
      ? `snapshot from ${utcDateLabel(fetchedMs)}`
      : `${state.origin === 'stale' ? 'cached, ' : ''}fetched ${ageLabel(nowMs - fetchedMs)}`;
  return `${label}: ${summary === undefined ? '' : `${summary} · `}${served}`;
}

function fetchedAtMs(state: DatasetStatusState): number {
  return state.status === 'ready' ? Date.parse(state.fetchedAt) : Number.NaN;
}

/** A negative age (the server's clock ahead of ours) reads as "just now" rather than a nonsense duration. */
function ageLabel(ageMs: number): string {
  if (ageMs < MINUTE_MS) return 'just now';
  if (ageMs < HOUR_MS) return `${Math.floor(ageMs / MINUTE_MS)} min ago`;
  if (ageMs < 2 * DAY_MS) return `${Math.floor(ageMs / HOUR_MS)} h ago`;
  return `${Math.floor(ageMs / DAY_MS)} days ago`;
}

function utcDateLabel(timeMs: number): string {
  const date = new Date(timeMs);
  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
