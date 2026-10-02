import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { openingStore } from '../scene/opening/openingStore';
import { BenchProbe } from './BenchProbe';
import { parseBenchRequest } from './benchScenarios';
import { hitchTimesMs, summarizeFrameTimes } from './frameTimes';
import { createSwarmGpuTiming } from './gpuTimer';

/**
 * Dev-only measurement for the exit runs; `SceneCanvas` mounts it behind `import.meta.env.DEV`, so none of it
 * ships. Results go to the console, where the Chrome runs read them.
 */
export function DevProbes() {
  const [benchRequest] = useState(() => parseBenchRequest(window.location.search));
  return (
    <>
      <OpeningFrameProbe />
      <GpuTimerProbe />
      {benchRequest && <BenchProbe request={benchRequest} />}
    </>
  );
}

/**
 * Records every frame of the opening from its first, which an injected recorder would miss: the opening starts as
 * soon as the catalog arrives. Logs once when it ends: `[opening]` for the move itself, `[startup]` for every frame
 * since the canvas's first, which also covers the wait for the catalog and the effects chunk landing.
 */
function OpeningFrameProbe() {
  const [recording] = useState(() => ({ openingMs: [] as number[], startupMs: [] as number[] }));
  const reported = useRef(false);
  useFrame((_, deltaSeconds) => {
    if (reported.current) return;
    recording.startupMs.push(deltaSeconds * 1000);
    if (openingStore.phase === 'playing') recording.openingMs.push(deltaSeconds * 1000);
    if (openingStore.phase !== 'done') return;
    reported.current = true;
    // A skipped opening (reduced motion, `?opening=off`) records nothing and has nothing to report.
    if (recording.openingMs.length === 0) return;
    logFrameTimes('[opening] frame times', recording.openingMs);
    logFrameTimes('[startup] frame times', recording.startupMs);
  });
  return null;
}

function logFrameTimes(label: string, frameTimesMs: readonly number[]): void {
  const summary = { ...summarizeFrameTimes(frameTimesMs), hitchesAtMs: hitchTimesMs(frameTimesMs) };
  console.info(`${label} ${JSON.stringify(summary)}`);
}

function GpuTimerProbe() {
  const context = useThree((state) => state.gl).getContext();
  const [timing] = useState(() => createSwarmGpuTiming(context));
  useFrame(({ scene, clock }) => timing?.update(scene, clock.elapsedTime));
  return null;
}
