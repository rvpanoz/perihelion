import type { WebGLRendererParameters } from 'three';

// World unit is 1 AU, so depth spans ~1e-6 to ~1e3 units. A logarithmic depth buffer keeps
// precision across that range and prevents z-fighting at planet scale (PLAN.md, Phase 0 + 3).
export const RENDERER_PARAMETERS = {
  antialias: true,
  logarithmicDepthBuffer: true,
} as const satisfies WebGLRendererParameters;

export const CAMERA_SETTINGS = {
  position: [0, 0, 2] as [number, number, number],
  fov: 50,
  near: 1e-6,
  far: 1e3,
};

export const SCENE_BACKGROUND = '#000000';
