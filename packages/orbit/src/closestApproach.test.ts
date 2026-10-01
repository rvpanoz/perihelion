import { describe, expect, it } from 'vitest';
import { closestApproach, findClosestApproach, writeGeocentricOffset } from './closestApproach';
import { planetElementsAt } from './planets';
import { norm } from './vector3';

const JD_TDB = 2_461_000.5;

describe('writeGeocentricOffset', () => {
  it("is zero for an object on the Earth–Moon barycentre's own orbit", () => {
    const elements = planetElementsAt('earthMoonBarycenter', JD_TDB);
    const offset = writeGeocentricOffset({ elements, jdTdb: JD_TDB }, [0, 0, 0]);
    expect(norm(offset)).toBeLessThan(1e-12);
  });
});

describe('findClosestApproach', () => {
  // A straight-line flyby, |r(t)| = √(d² + v²(t − t₀)²): the shape of every CAD pass near closest approach.
  const flyby = (closestJdTdb: number) => (jdTdb: number) =>
    Math.hypot(2.5e-4, 0.004 * (jdTdb - closestJdTdb));

  it('finds a minimum between hourly samples to well under a second', () => {
    const closestJdTdb = JD_TDB + 1.3712345;
    const found = findClosestApproach({ distanceAtJd: flyby(closestJdTdb), aroundJdTdb: JD_TDB });
    expect(Math.abs(found.jdTdb - closestJdTdb)).toBeLessThan(1e-6);
    expect(found.distanceAu).toBeCloseTo(2.5e-4, 12);
  });

  it('finds a minimum before the guess too', () => {
    const closestJdTdb = JD_TDB - 2.04;
    const found = findClosestApproach({ distanceAtJd: flyby(closestJdTdb), aroundJdTdb: JD_TDB });
    expect(Math.abs(found.jdTdb - closestJdTdb)).toBeLessThan(1e-6);
  });
});

describe('closestApproach', () => {
  it('searches the engine distance from the Earth–Moon barycentre', () => {
    // The search itself is tested above; this pins what it is searching. CAD rows check it end to end.
    const elements = planetElementsAt('mars', JD_TDB);
    const distanceAtJd = (jdTdb: number) =>
      norm(writeGeocentricOffset({ elements, jdTdb }, [0, 0, 0]));
    expect(closestApproach(elements, JD_TDB)).toEqual(
      findClosestApproach({ distanceAtJd, aroundJdTdb: JD_TDB }),
    );
  });
});
