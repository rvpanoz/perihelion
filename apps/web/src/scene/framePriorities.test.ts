import { describe, expect, it } from 'vitest';
import { FRAME_PRIORITY } from './framePriorities';

describe('frame priorities', () => {
  it('run time → body positions → camera rig → scene objects', () => {
    const { clock, bodyPositions, cameraRig, sceneObjects } = FRAME_PRIORITY;
    expect(clock).toBeLessThan(bodyPositions);
    expect(bodyPositions).toBeLessThan(cameraRig);
    expect(cameraRig).toBeLessThan(sceneObjects);
  });

  it('never take over rendering (R3F does that for priorities above 0)', () => {
    for (const priority of Object.values(FRAME_PRIORITY)) expect(priority).toBeLessThanOrEqual(0);
  });
});
