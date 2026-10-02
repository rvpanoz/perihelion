import type { WebGLRendererParameters } from 'three';

// World unit is 1 AU, so depth spans ~1e-6 to ~1e3 units. A logarithmic depth buffer keeps
// precision across that range and prevents z-fighting at planet scale (PLAN.md, Phase 0 + 3).
// The composer renders off-screen with its own MSAA (per quality tier), so the canvas's MSAA buffer would never reach
// the screen and only cost memory and fill.
export const RENDERER_PARAMETERS = {
  antialias: false,
  logarithmicDepthBuffer: true,
} as const satisfies WebGLRendererParameters;

export const CAMERA_SETTINGS = {
  // ≈ 3 AU out and 30° above the ecliptic (scene +y is ecliptic north), so orbits read as ellipses;
  // R3F aims the default camera at the origin.
  position: [0, 1.5, 2.598] as [number, number, number],
  fov: 50,
  near: 1e-6,
  far: 1e3,
};

export const SCENE_BACKGROUND = '#000000';
