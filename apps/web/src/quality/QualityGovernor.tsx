import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { FRAME_PRIORITY } from '../scene/framePriorities';
import { type DeviceHints, initialTier } from './initialTier';
import { qualityStore } from './qualityStore';

/**
 * Feeds every frame's time to the store, which hands it to the governor while the preference is Auto. Frame times
 * are read in `useFrame` and only a tier change reaches React (decision 5).
 */
export function QualityGovernor() {
  const gl = useThree((state) => state.gl);
  useEffect(
    () => qualityStore.applyFirstGuess(initialTier(readDeviceHints(gl.getContext()))),
    [gl],
  );
  useEffect(discardFramesOnVisibilityChange, []);
  useEffect(logTierChangesInDev, []);
  useFrame(
    (_, deltaSeconds) => qualityStore.recordFrame(deltaSeconds * 1000),
    FRAME_PRIORITY.sceneObjects,
  );
  return null;
}

function readDeviceHints(context: WebGLRenderingContext): DeviceHints {
  return {
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    shortSidePx: Math.min(window.screen.width, window.screen.height),
    gpuRenderer: gpuRendererName(context),
  };
}

/** Chrome and Safari expose the unmasked name through the extension; Firefox deprecated it for `RENDERER`. */
function gpuRendererName(context: WebGLRenderingContext): string {
  const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = context.getParameter(
    debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : context.RENDERER,
  );
  return typeof name === 'string' ? name : '';
}

function discardFramesOnVisibilityChange(): () => void {
  document.addEventListener('visibilitychange', qualityStore.discardFrameWindow);
  return () => document.removeEventListener('visibilitychange', qualityStore.discardFrameWindow);
}

/** `[quality] high → medium`, for the Step 12 runs; production builds drop it. */
function logTierChangesInDev(): (() => void) | undefined {
  if (!import.meta.env.DEV) return undefined;
  let shownTierName = qualityStore.tierName;
  return qualityStore.subscribe(() => {
    if (qualityStore.tierName === shownTierName) return;
    console.info(`[quality] ${shownTierName} → ${qualityStore.tierName}`);
    shownTierName = qualityStore.tierName;
  });
}
