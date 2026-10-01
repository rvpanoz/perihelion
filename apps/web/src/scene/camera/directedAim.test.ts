import type { Vector3 } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { DirectedAim } from './directedAim';

const TO: Vector3 = [0, 1, 0];

function write(
  aim: DirectedAim,
  frame: { serial: number; eased: number; offset: Vector3 },
): Vector3 {
  return aim.write(
    {
      flightSerial: frame.serial,
      easedProgress: frame.eased,
      cameraOffset: frame.offset,
      toDirection: TO,
    },
    [0, 0, 0],
  );
}

function expectDirection(actual: Vector3, expected: Vector3): void {
  for (const axis of [0, 1, 2] as const) expect(actual[axis]).toBeCloseTo(expected[axis], 12);
}

describe('DirectedAim', () => {
  it('starts where the camera was and ends on the requested direction', () => {
    const aim = new DirectedAim();
    expectDirection(write(aim, { serial: 1, eased: 0, offset: [3, 0, 0] }), [1, 0, 0]);
    const halfway = write(aim, { serial: 1, eased: 0.5, offset: [0, 5, 5] });
    expectDirection(halfway, [Math.SQRT1_2, Math.SQRT1_2, 0]);
    expectDirection(write(aim, { serial: 1, eased: 1, offset: [0, 5, 5] }), TO);
  });

  it('captures the start again for a new flight', () => {
    const aim = new DirectedAim();
    write(aim, { serial: 1, eased: 0.5, offset: [3, 0, 0] });
    expectDirection(write(aim, { serial: 2, eased: 0, offset: [0, 0, 2] }), [0, 0, 1]);
  });
});
