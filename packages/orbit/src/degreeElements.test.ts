import { describe, expect, it } from 'vitest';
import { elementsFromDegrees } from './degreeElements';

describe('elementsFromDegrees', () => {
  it('converts the four angles to radians and passes the rest through', () => {
    const elements = elementsFromDegrees({
      epochJdTdb: 2_461_000.5,
      eccentricity: 0.2,
      semiMajorAxisAu: 1.1,
      inclinationDeg: 90,
      longitudeOfAscendingNodeDeg: 180,
      argumentOfPerihelionDeg: 45,
      meanAnomalyDeg: 360,
    });
    expect(elements).toEqual({
      epochJdTdb: 2_461_000.5,
      eccentricity: 0.2,
      semiMajorAxisAu: 1.1,
      inclinationRad: Math.PI / 2,
      longitudeOfAscendingNodeRad: Math.PI,
      argumentOfPerihelionRad: Math.PI / 4,
      meanAnomalyRad: 2 * Math.PI,
    });
  });
});
