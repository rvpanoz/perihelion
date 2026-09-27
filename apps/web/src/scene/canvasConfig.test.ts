import { describe, expect, it } from 'vitest';
import { CAMERA_SETTINGS, RENDERER_PARAMETERS, SCENE_BACKGROUND } from './canvasConfig';

describe('canvas configuration', () => {
  it('enables the logarithmic depth buffer', () => {
    expect(RENDERER_PARAMETERS.logarithmicDepthBuffer).toBe(true);
  });

  it('renders on a black background', () => {
    expect(SCENE_BACKGROUND).toBe('#000000');
  });

  it('keeps the near plane below the far plane', () => {
    expect(CAMERA_SETTINGS.near).toBeLessThan(CAMERA_SETTINGS.far);
  });
});
