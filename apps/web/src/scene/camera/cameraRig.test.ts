import { describe, expect, it, vi } from 'vitest';
import { createBodyPositions } from '../bodies/bodyPositions';
import { CameraRig } from './cameraRig';
import { defaultViewDistanceAu } from './viewDistances';

function setup() {
  let nowSeconds = 0;
  const rig = new CameraRig({ initialDistanceAu: 3, nowSeconds: () => nowSeconds });
  const positions = createBodyPositions();
  positions.earthMoonBarycenter = [0.98, 0.17, 0];
  positions.mars = [-1.4, 0.6, 0.05];
  const frame = (cameraDistanceAu = 3) =>
    rig.update({ bodyPositions: positions, cameraDistanceAu });
  return { rig, positions, frame, setNow: (seconds: number) => (nowSeconds = seconds) };
}

describe('CameraRig', () => {
  it('starts on the Sun and follows the user’s zoom when idle', () => {
    const { rig, frame } = setup();
    expect(rig.focus).toBe('sun');
    expect(frame(1.25)).toEqual({ originAu: [0, 0, 0], distanceAu: 1.25 });
  });

  it('switches focus at once, notifies, then flies to the target', () => {
    const { rig, frame, setNow } = setup();
    const listener = vi.fn();
    rig.subscribe(listener);
    rig.flyTo({ focus: 'earthMoonBarycenter', durationSeconds: 2 });
    expect(rig.focus).toBe('earthMoonBarycenter');
    expect(listener).toHaveBeenCalledOnce();
    const departing = frame();
    expect(departing.originAu).toEqual([0, 0, 0]);
    expect(departing.distanceAu).toBeCloseTo(3, 12);
    setNow(2);
    const arrived = frame();
    expect(arrived.originAu).toEqual([0.98, 0.17, 0]);
    expect(arrived.distanceAu).toBeCloseTo(defaultViewDistanceAu('earthMoonBarycenter'), 15);
    expect(rig.flying).toBe(false);
  });

  it('keeps following a moving focus after arrival', () => {
    const { rig, positions, frame, setNow } = setup();
    rig.flyTo({ focus: 'mars', durationSeconds: 0 });
    frame();
    positions.mars = [-1.3, 0.7, 0.05];
    setNow(5);
    expect(frame(0.01).originAu).toEqual([-1.3, 0.7, 0.05]);
  });

  it('starts a retargeted flight from where the camera is, without a snap', () => {
    const { rig, frame, setNow } = setup();
    rig.flyTo({ focus: 'earthMoonBarycenter', durationSeconds: 2 });
    setNow(1);
    const midway = structuredClone(frame());
    rig.flyTo({ focus: 'mars', durationSeconds: 2 });
    const restarted = frame();
    expect(restarted.originAu).toEqual(midway.originAu);
    expect(restarted.distanceAu).toBeCloseTo(midway.distanceAu, 12);
  });
});
