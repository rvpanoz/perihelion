/**
 * `useFrame` callbacks run in ascending priority each frame; the order is the data flow. Priorities stay ≤ 0
 * because R3F hands rendering to any callback with a priority above 0.
 */
export const FRAME_PRIORITY = {
  clock: -3,
  bodyPositions: -2,
  cameraRig: -1,
  sceneObjects: 0,
} as const;
