import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type CmeFrontMotion,
  DONKI_MEASUREMENT_DISTANCE_AU,
  SOLAR_RADIUS_AU,
  cmeFrontDistanceAu,
  cmeFrontMotion,
} from './cmeKinematics';
import { KM_PER_AU } from './units';

const TIME21_5_JD_TDB = 2_461_300.25;
const NOMINAL_SOLAR_RADIUS_KM = 695_700;
const ARRIVAL_DISTANCE_TOLERANCE_AU = 1e-12;
const unusedEarthDistance = (): number => {
  throw new Error('Earth distance is not needed without an ENLIL arrival.');
};

const transitDays = fc.double({ min: 0.5, max: 6, noNaN: true });
const earthDistanceAu = fc.double({ min: 0.98, max: 1.02, noNaN: true });
const speedKmPerS = fc.double({ min: 100, max: 3500, noNaN: true });
const dayOffset = fc.double({ min: -10, max: 10, noNaN: true });

function measuredMotion(speed: number): CmeFrontMotion {
  return cmeFrontMotion(
    { time21_5JdTdb: TIME21_5_JD_TDB, speedKmPerS: speed, earthArrivalJdTdb: null },
    unusedEarthDistance,
  );
}

describe('solar distances', () => {
  it('uses the nominal solar radius and measures at 21.5 of them', () => {
    expect(SOLAR_RADIUS_AU * KM_PER_AU).toBeCloseTo(NOMINAL_SOLAR_RADIUS_KM, 6);
    expect(DONKI_MEASUREMENT_DISTANCE_AU).toBe(21.5 * SOLAR_RADIUS_AU);
    expect(DONKI_MEASUREMENT_DISTANCE_AU).toBeCloseTo(0.09999, 5);
  });
});

describe('cmeFrontMotion without an ENLIL arrival', () => {
  it('moves at the measured speed', () => {
    expect(measuredMotion(1000).speedAuPerDay).toBe((1000 * 86_400) / KM_PER_AU);
  });

  it('is at the measurement distance at time21_5', () => {
    expect(cmeFrontDistanceAu(measuredMotion(1000), TIME21_5_JD_TDB)).toBe(
      DONKI_MEASUREMENT_DISTANCE_AU,
    );
  });
});

describe('cmeFrontMotion with an ENLIL arrival', () => {
  it('meets both DONKI times: the measurement distance at time21_5 and Earth at the arrival', () => {
    fc.assert(
      fc.property(transitDays, earthDistanceAu, (transit, earthAu) => {
        const arrivalJdTdb = TIME21_5_JD_TDB + transit;
        const motion = cmeFrontMotion(
          { time21_5JdTdb: TIME21_5_JD_TDB, speedKmPerS: 1000, earthArrivalJdTdb: arrivalJdTdb },
          () => earthAu,
        );
        expect(cmeFrontDistanceAu(motion, TIME21_5_JD_TDB)).toBe(DONKI_MEASUREMENT_DISTANCE_AU);
        expect(Math.abs(cmeFrontDistanceAu(motion, arrivalJdTdb) - earthAu)).toBeLessThanOrEqual(
          ARRIVAL_DISTANCE_TOLERANCE_AU,
        );
      }),
    );
  });

  it('reads Earth at the arrival time', () => {
    const arrivalJdTdb = TIME21_5_JD_TDB + 2;
    const readTimes: number[] = [];
    cmeFrontMotion(
      { time21_5JdTdb: TIME21_5_JD_TDB, speedKmPerS: 1000, earthArrivalJdTdb: arrivalJdTdb },
      (jdTdb) => {
        readTimes.push(jdTdb);
        return 1;
      },
    );
    expect(readTimes).toEqual([arrivalJdTdb]);
  });

  it.each([0, -1])('throws when the arrival is %d days from time21_5', (offsetDays) => {
    const timing = {
      time21_5JdTdb: TIME21_5_JD_TDB,
      speedKmPerS: 1000,
      earthArrivalJdTdb: TIME21_5_JD_TDB + offsetDays,
    };
    expect(() => cmeFrontMotion(timing, () => 1)).toThrow(RangeError);
  });
});

describe('cmeFrontDistanceAu', () => {
  it('never moves backwards in time', () => {
    fc.assert(
      fc.property(speedKmPerS, dayOffset, dayOffset, (speed, first, second) => {
        const motion = measuredMotion(speed);
        const [earlier, later] = first <= second ? [first, second] : [second, first];
        expect(cmeFrontDistanceAu(motion, TIME21_5_JD_TDB + later)).toBeGreaterThanOrEqual(
          cmeFrontDistanceAu(motion, TIME21_5_JD_TDB + earlier),
        );
      }),
    );
  });

  it('holds the front at the photosphere long before launch', () => {
    expect(cmeFrontDistanceAu(measuredMotion(1000), TIME21_5_JD_TDB - 30)).toBe(SOLAR_RADIUS_AU);
  });
});
