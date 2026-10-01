import { describe, expect, it } from 'vitest';
import { asteroidPositionAu } from '../approach/asteroidPosition';
import { BODY_IDS } from '../bodies/bodyCatalog';
import { bodyPositions } from '../bodies/bodyPositions';
import { focusPositions } from './focusPositions';

describe('focusPositions', () => {
  it('reads the same arrays the updaters write, so it never needs copying', () => {
    expect(focusPositions.asteroid).toBe(asteroidPositionAu);
    for (const body of BODY_IDS) expect(focusPositions[body]).toBe(bodyPositions[body]);
  });
});
