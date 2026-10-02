import type { CloseApproach } from '@perihelion/data';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { WebGLRenderer } from 'three';
import { playApproach } from '../approaches/playApproach';
import { loadDataset } from '../data/loadDataset';
import { watchEruption } from '../eruptions/watchEruption';
import { cameraRig } from '../scene/camera/cameraRig';
import { qualityStore } from '../quality/qualityStore';
import { openingStore } from '../scene/opening/openingStore';
import { chooseApproach } from '../shell/shotSelection';
import { timeStore } from '../time/timeStore';
import { BenchRun } from './benchRun';
import {
  type BenchData,
  type BenchRequest,
  type BenchTargets,
  benchShot,
  type MeasuredScenario,
  TOUR_SECONDS,
  tourStepsDue,
} from './benchScenarios';
import { summarizeFrameTimes } from './frameTimes';

/** As the viewer does it: choosing the row in the list, then Play approach on its card. */
const APP_BENCH_TARGETS: BenchTargets = {
  camera: cameraRig,
  time: timeStore,
  playApproach: (approach: CloseApproach) => {
    chooseApproach(approach);
    playApproach(approach);
  },
  watchEruption: (cme) => watchEruption(cme),
};

/**
 * The dev-only `?bench=<scenario>` (Phase 7 baseline). Starts once the opening is over and the lists are loaded,
 * and logs `[bench] <scenario> <json>` for the Chrome runs to read.
 */
export function BenchProbe({ request }: { request: BenchRequest }) {
  const data = useBenchData();
  const openingPhase = useSyncExternalStore(openingStore.subscribe, () => openingStore.phase);
  if (!data || openingPhase !== 'done') return null;
  if (request.scenario === 'tour') return <TourBench data={data} />;
  return <MeasuredBench scenario={request.scenario} data={data} />;
}

/** Its own copy of the lists, so the bench needs nothing threaded through `App`; dev only. */
function useBenchData(): BenchData | undefined {
  const [data, setData] = useState<BenchData>();
  useEffect(() => {
    let mounted = true;
    loadBenchData().then(
      (loaded) => mounted && setData(loaded),
      (error: unknown) => console.error('[bench] could not load the lists', error),
    );
    return () => {
      mounted = false;
    };
  }, []);
  return data;
}

async function loadBenchData(): Promise<BenchData> {
  const [approaches, cmes] = await Promise.all([
    loadDataset('close-approaches'),
    loadDataset('cmes'),
  ]);
  return { approaches: approaches.data, cmes: cmes.data };
}

interface MeasuredBenchProps {
  scenario: MeasuredScenario;
  data: BenchData;
}

function MeasuredBench({ scenario, data }: MeasuredBenchProps) {
  const gl = useThree((state) => state.gl);
  const [shot] = useState(() => benchShot(scenario, { data, targets: APP_BENCH_TARGETS }));
  const [run] = useState(() => shot && new BenchRun(shot, () => cameraRig.flying));
  useEffect(() => {
    if (!shot) console.warn(`[bench] ${scenario}: nothing in the data to play`);
  }, [scenario, shot]);
  useFrame((_, deltaSeconds) => {
    const frameTimesMs = run?.frame(deltaSeconds * 1000);
    if (shot && frameTimesMs) logBenchResult({ scenario, subject: shot.subject, frameTimesMs, gl });
  });
  return null;
}

interface BenchResult {
  scenario: MeasuredScenario;
  subject: string;
  frameTimesMs: readonly number[];
  gl: WebGLRenderer;
}

/**
 * Canvas size in CSS pixels, the pixel ratio and the tier at the end: every measurement records what it drew. On
 * Auto the governor may change the tier during a run.
 */
function logBenchResult({ scenario, subject, frameTimesMs, gl }: BenchResult): void {
  const canvas = gl.domElement;
  const result = {
    ...summarizeFrameTimes(frameTimesMs),
    subject,
    canvasCssPx: [canvas.clientWidth, canvas.clientHeight],
    dpr: gl.getPixelRatio(),
    tier: qualityStore.tierName,
    qualityPreference: qualityStore.preference,
    search: window.location.search,
  };
  console.info(`[bench] ${scenario} ${JSON.stringify(result)}`);
}

/** The recording path: no timing, so the screen recorder's own cost doesn't matter. */
function TourBench({ data }: { data: BenchData }) {
  const elapsedSeconds = useRef(0);
  useFrame((_, deltaSeconds) => {
    const fromSeconds = elapsedSeconds.current;
    if (fromSeconds >= TOUR_SECONDS) return;
    elapsedSeconds.current += deltaSeconds;
    for (const step of tourStepsDue(fromSeconds, elapsedSeconds.current)) {
      benchShot(step.scenario, { data, targets: APP_BENCH_TARGETS })?.start();
    }
    if (elapsedSeconds.current >= TOUR_SECONDS) console.info('[bench] tour done');
  });
  return null;
}
