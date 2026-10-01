import type { Vector3 } from '@perihelion/orbit';
import { describe, expect, it, vi } from 'vitest';
import { createBodyPositions } from '../bodies/bodyPositions';
import { CameraRig } from './cameraRig';
import type { FocusId } from './focusPositions';
import { defaultViewDistanceAu } from './viewDistances';

function setup() {
  let nowSeconds = 0;
  const rig = new CameraRig({ initialDistanceAu: 3, nowSeconds: () => nowSeconds });
  const positions: Record<FocusId, Vector3> = {
    ...createBodyPositions(),
    asteroid: [0.99, 0.18, 0.001],
  };
  positions.earthMoonBarycenter = [0.98, 0.17, 0];
  positions.mars = [-1.4, 0.6, 0.05];
  const frame = (cameraDistanceAu = 3) => rig.update({ positions, cameraDistanceAu });
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

  it('starts a retargeted flight from where the camera is, without a snap (Review Focus 3)', () => {
    const { rig, frame, setNow } = setup();
    rig.flyTo({ focus: 'earthMoonBarycenter', durationSeconds: 2 });
    setNow(1);
    const midway = structuredClone(frame());
    rig.flyTo({ focus: 'asteroid', distanceAu: 1e-4, durationSeconds: 2, chase: true });
    const restarted = frame();
    expect(restarted.originAu).toEqual(midway.originAu);
    expect(restarted.distanceAu).toBeCloseTo(midway.distanceAu, 12);
  });

  it('follows the asteroid like any other focus', () => {
    const { rig, positions, frame } = setup();
    rig.flyTo({ focus: 'asteroid', durationSeconds: 0 });
    expect(frame().originAu).toEqual(positions.asteroid);
  });

  it('chases only when asked, until the next flight', () => {
    const { rig } = setup();
    rig.flyTo({ focus: 'asteroid', distanceAu: 1e-4, chase: true });
    expect(rig.chasing).toBe(true);
    rig.flyTo({ focus: 'mars' });
    expect(rig.chasing).toBe(false);
  });

  it('notifies on stopChase only when a chase was running', () => {
    const { rig } = setup();
    rig.flyTo({ focus: 'asteroid', distanceAu: 1e-4, chase: true });
    const listener = vi.fn();
    rig.subscribe(listener);
    rig.stopChase();
    rig.stopChase();
    expect(rig.chasing).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('keeps a flight’s requested direction until the next flight', () => {
    const { rig } = setup();
    const direction: Vector3 = [0, 1, 0];
    rig.flyTo({ focus: 'sun', direction });
    expect(rig.flightDirection).toBe(direction);
    rig.flyTo({ focus: 'mars' });
    expect(rig.flightDirection).toBeUndefined();
  });

  it('counts flights and reports their eased progress, 1 when not flying', () => {
    const { rig, frame, setNow } = setup();
    expect(rig.flightEasedProgress).toBe(1);
    rig.flyTo({ focus: 'mars', durationSeconds: 2 });
    const serial = rig.flightSerial;
    expect(rig.flightEasedProgress).toBe(0);
    setNow(1);
    frame();
    expect(rig.flightEasedProgress).toBeCloseTo(0.5, 15);
    setNow(2);
    frame();
    expect(rig.flightEasedProgress).toBe(1);
    rig.flyTo({ focus: 'sun' });
    expect(rig.flightSerial).toBe(serial + 1);
  });
});
