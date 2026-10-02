import { describe, expect, it } from 'vitest';
import { CAMERA_SETTINGS, RENDERER_PARAMETERS, SCENE_BACKGROUND } from './canvasConfig';

describe('canvas configuration', () => {
  it('enables the logarithmic depth buffer', () => {
    expect(RENDERER_PARAMETERS.logarithmicDepthBuffer).toBe(true);
  });

  it('leaves antialiasing to the composer, whose off-screen buffers are what reach the screen', () => {
    expect(RENDERER_PARAMETERS.antialias).toBe(false);
  });

  it('renders on a black background', () => {
    expect(SCENE_BACKGROUND).toBe('#000000');
  });

  it('keeps the near plane below the far plane', () => {
    expect(CAMERA_SETTINGS.near).toBeLessThan(CAMERA_SETTINGS.far);
  });

  it('starts the camera about 3 AU from the Sun, above the ecliptic', () => {
    expect(Math.hypot(...CAMERA_SETTINGS.position)).toBeCloseTo(3, 3);
    expect(CAMERA_SETTINGS.position[1]).toBeGreaterThan(0);
  });
});
