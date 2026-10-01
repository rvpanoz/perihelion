import { describe, expect, it } from 'vitest';
import { BODY_IDS, radiusAu } from '../bodies/bodyCatalog';
import { CAMERA_SETTINGS } from '../canvasConfig';
import { MAX_VIEW_DISTANCE_AU, defaultViewDistanceAu, minViewDistanceAu } from './viewDistances';

describe('view distances', () => {
  it.each(BODY_IDS)('orders min < default < max for %s', (body) => {
    expect(minViewDistanceAu(body)).toBeLessThan(defaultViewDistanceAu(body));
    expect(defaultViewDistanceAu(body)).toBeLessThan(MAX_VIEW_DISTANCE_AU);
  });

  it.each(BODY_IDS)('never lets the near plane clip %s at the closest zoom', (body) => {
    const closestSurfaceGapAu = minViewDistanceAu(body) - radiusAu(body);
    expect(CAMERA_SETTINGS.near).toBeLessThan(closestSurfaceGapAu);
  });

  it('lets the camera within 300 km of an asteroid and starts it 1e-3 AU away', () => {
    expect(minViewDistanceAu('asteroid')).toBe(2e-6);
    expect(defaultViewDistanceAu('asteroid')).toBe(1e-3);
    expect(CAMERA_SETTINGS.near).toBeLessThan(minViewDistanceAu('asteroid'));
  });

  it('starts the camera at the Sun’s default view distance', () => {
    expect(Math.hypot(...CAMERA_SETTINGS.position)).toBeCloseTo(defaultViewDistanceAu('sun'), 3);
  });
});
