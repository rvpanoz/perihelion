import type { QualityTierName } from './qualityTiers';

export interface DeviceHints {
  coarsePointer: boolean;
  shortSidePx: number;
  /** The GPU's name as WebGL reports it; empty where the browser masks it. */
  gpuRenderer: string;
}

/** Below this short side, a touch screen is a phone: small, hot and battery-bound. */
const PHONE_SHORT_SIDE_PX = 600;

/** Integrated and mobile GPUs: fill rate is their first limit (Phase 7 baseline at `?dpr=2`). */
const MODEST_GPU = /intel|mali|adreno|powervr/i;

/**
 * Only a first guess: the governor corrects it from frame times. An unknown or masked GPU starts on High, because a
 * drop costs about 6 s while climbing back costs a steady minute per tier.
 */
export function initialTier(device: DeviceHints): QualityTierName {
  if (device.coarsePointer && device.shortSidePx < PHONE_SHORT_SIDE_PX) return 'low';
  if (MODEST_GPU.test(device.gpuRenderer)) return 'medium';
  return 'high';
}
