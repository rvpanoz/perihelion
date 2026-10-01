import { type Vector3, norm } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { writeChaseDirection } from './approachCamera';
import { ChaseAim, type ChaseFrame } from './chaseAim';

const OFFSET_AU: Vector3 = [2e-3, 1e-3, 0];
const PASS_NORMAL: Vector3 = [0, 0, 1];
const CHASE_SCENE_DIRECTION = sceneAxesFromEcliptic(
  writeChaseDirection(OFFSET_AU, PASS_NORMAL, [0, 0, 0]),
);

function chaseFrame(overrides: Partial<ChaseFrame> = {}): ChaseFrame {
  return {
    flightSerial: 1,
    easedProgress: 0,
    cameraOffset: [0, 0, 5],
    geocentricOffsetAu: OFFSET_AU,
    passNormal: PASS_NORMAL,
    ...overrides,
  };
}

function expectDirection(actual: Readonly<Vector3>, expected: Readonly<Vector3>): void {
  for (const axis of [0, 1, 2] as const) expect(actual[axis]).toBeCloseTo(expected[axis], 12);
}

describe('ChaseAim', () => {
  it('keeps the view direction on the first frame of a chase flight', () => {
    const aim = new ChaseAim();
    expectDirection(aim.write(chaseFrame(), [0, 0, 0]), [0, 0, 1]);
  });

  it('turns to the chase direction by the end of the flight and stays there', () => {
    const aim = new ChaseAim();
    aim.write(chaseFrame(), [0, 0, 0]);
    const arrived = chaseFrame({ easedProgress: 1, cameraOffset: [7, 0, 0] });
    expectDirection(aim.write(arrived, [0, 0, 0]), CHASE_SCENE_DIRECTION);
  });

  it('is a unit vector midway', () => {
    const aim = new ChaseAim();
    aim.write(chaseFrame(), [0, 0, 0]);
    expect(norm(aim.write(chaseFrame({ easedProgress: 0.5 }), [0, 0, 0]))).toBeCloseTo(1, 12);
  });

  it('starts again from the current view when a new flight begins', () => {
    const aim = new ChaseAim();
    aim.write(chaseFrame({ easedProgress: 1 }), [0, 0, 0]);
    const retargeted = chaseFrame({ flightSerial: 2, cameraOffset: [0, 3, 0] });
    expectDirection(aim.write(retargeted, [0, 0, 0]), [0, 1, 0]);
  });
});
