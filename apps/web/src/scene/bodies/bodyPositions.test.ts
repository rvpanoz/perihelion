import { PLANETS, planetStateAt } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TIME_RANGE_JD_TDB } from '../../time/timeController';
import { createBodyPositions, updateBodyPositions } from './bodyPositions';

const jdInRange = fc.double({
  min: TIME_RANGE_JD_TDB.startJdTdb,
  max: TIME_RANGE_JD_TDB.endJdTdb,
  noNaN: true,
});

describe('body positions', () => {
  it('matches the engine for every planet at any date in range', () => {
    const positions = createBodyPositions();
    fc.assert(
      fc.property(jdInRange, (jdTdb) => {
        updateBodyPositions(positions, jdTdb);
        for (const planet of PLANETS) {
          expect(positions[planet]).toEqual(planetStateAt(planet, jdTdb).positionAu);
        }
      }),
    );
  });

  it('keeps the Sun at the heliocentric origin', () => {
    const positions = createBodyPositions();
    updateBodyPositions(positions, 2_451_545);
    expect(positions.sun).toEqual([0, 0, 0]);
  });
});
