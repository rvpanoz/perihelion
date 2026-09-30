import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { openingStore } from '../scene/opening/openingStore';
import { hitchTimesMs, summarizeFrameTimes } from './frameTimes';
import { createSwarmGpuTiming } from './gpuTimer';

/**
 * Dev-only measurement for the Phase 4 exit runs; `SceneCanvas` mounts it behind `import.meta.env.DEV`, so none of
 * it ships. Results go to the console, where the Chrome runs read them.
 */
export function DevProbes() {
  return (
    <>
      <OpeningFrameProbe />
      <GpuTimerProbe />
    </>
  );
}

/**
 * Records every frame of the opening from its first, which an injected recorder would miss: the opening starts as
 * soon as the local catalog arrives. Logs once when it ends.
 */
function OpeningFrameProbe() {
  const [frameTimesMs] = useState<number[]>(() => []);
  const reported = useRef(false);
  useFrame((_, deltaSeconds) => {
    if (reported.current) return;
    if (openingStore.phase === 'playing') frameTimesMs.push(deltaSeconds * 1000);
    if (openingStore.phase !== 'done') return;
    reported.current = true;
    // A skipped opening (reduced motion, `?opening=off`) records nothing and has nothing to report.
    if (frameTimesMs.length === 0) return;
    const summary = {
      ...summarizeFrameTimes(frameTimesMs),
      hitchesAtMs: hitchTimesMs(frameTimesMs),
    };
    console.info(`[opening] frame times ${JSON.stringify(summary)}`);
  });
  return null;
}

function GpuTimerProbe() {
  const context = useThree((state) => state.gl).getContext();
  const [timing] = useState(() => createSwarmGpuTiming(context));
  useFrame(({ scene, clock }) => timing?.update(scene, clock.elapsedTime));
  return null;
}
