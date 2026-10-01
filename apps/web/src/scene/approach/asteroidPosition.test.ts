import { elementsFromDegrees, stateAtTime } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { closeApproachRow } from '../../test/closeApproachRow';
import {
  asteroidPositionAu,
  elementsForApproach,
  updateAsteroidPosition,
} from './asteroidPosition';

describe('elementsForApproach', () => {
  it("converts the row's orbit once and hands back the same elements for the same row", () => {
    const approach = closeApproachRow();
    const elements = elementsForApproach(approach);
    expect(elements).toEqual(elementsFromDegrees(approach.orbit));
    expect(elementsForApproach(approach)).toBe(elements);
    expect(elementsForApproach(closeApproachRow())).not.toBe(elements);
  });
});

describe('updateAsteroidPosition', () => {
  it("writes the engine's heliocentric position at the given time", () => {
    const approach = closeApproachRow();
    updateAsteroidPosition(approach, approach.approachJdTdb);
    const expected = stateAtTime(elementsFromDegrees(approach.orbit), approach.approachJdTdb);
    expect(asteroidPositionAu).toEqual(expected.positionAu);
  });
});
