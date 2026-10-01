import fc from 'fast-check';
import { dot, norm, type Vector3 } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import {
  CHASE_ELEVATION_RAD,
  approachPlayback,
  followDistanceAu,
  writeChaseDirection,
  writeDifference,
  writeDirectionBlend,
  writeUnit,
} from './approachCamera';
import { crossingDays } from './approachTiming';

const APOPHIS_LIKE = {
  approachJdTdb: 2_462_240.4,
  distanceAu: 2.5e-4,
  relativeVelocityKmPerS: 7.42,
};
const nonZeroOffset = fc
  .tuple(
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
  )
  .filter((vector) => norm(vector) > 1e-6);

describe('approachPlayback', () => {
  it('starts three crossing times early and plays six of them in 12 s', () => {
    const tau = crossingDays(APOPHIS_LIKE);
    const playback = approachPlayback(APOPHIS_LIKE);
    expect(playback.startJdTdb).toBeCloseTo(APOPHIS_LIKE.approachJdTdb - 3 * tau, 9);
    expect(playback.rateDaysPerSecond).toBeCloseTo((6 * tau) / 12, 12);
  });

  it('works the same for an approach in the past', () => {
    const past = { ...APOPHIS_LIKE, approachJdTdb: 2_461_000.5 };
    expect(approachPlayback(past).startJdTdb).toBeLessThan(past.approachJdTdb);
  });
});

describe('followDistanceAu', () => {
  it('is a fixed fraction of the miss distance', () => {
    expect(followDistanceAu(APOPHIS_LIKE)).toBeCloseTo(0.6 * 2.5e-4, 15);
  });
});

describe('writeChaseDirection', () => {
  it('is a unit vector 20° from the Earth→asteroid line, tilted toward the pass normal', () => {
    fc.assert(
      fc.property(nonZeroOffset, nonZeroOffset, (offset, normalSeed) => {
        const away = writeUnit(offset, [0, 0, 0]);
        const passNormal = writeUnit(normalSeed, [0, 0, 0]);
        // Over 25° from the normal, so the tilt has a direction.
        fc.pre(Math.abs(dot(away, passNormal)) < 0.9);
        const direction = writeChaseDirection(offset, passNormal, [0, 0, 0]);
        expect(norm(direction)).toBeCloseTo(1, 12);
        expect(dot(direction, away)).toBeCloseTo(Math.cos(CHASE_ELEVATION_RAD), 12);
        expect(dot(direction, passNormal)).toBeGreaterThan(dot(away, passNormal));
      }),
    );
  });

  it('never puts the camera nearer Earth than the asteroid (Review Focus 5)', () => {
    fc.assert(
      fc.property(
        nonZeroOffset,
        nonZeroOffset,
        fc.double({ min: 1e-9, max: 1, noNaN: true }),
        (offset, normalSeed, distanceAu) => {
          const passNormal = writeUnit(normalSeed, [0, 0, 0]);
          const direction = writeChaseDirection(offset, passNormal, [0, 0, 0]);
          const camera: Vector3 = [
            offset[0] + distanceAu * direction[0],
            offset[1] + distanceAu * direction[1],
            offset[2] + distanceAu * direction[2],
          ];
          expect(norm(camera)).toBeGreaterThan(norm(offset));
        },
      ),
    );
  });

  it('holds its tilt from the pass plane while the line swings past the ecliptic pole', () => {
    // A pass in the y–z plane running under the south pole: a tilt toward north would turn half a circle here.
    const passNormal: Vector3 = [1, 0, 0];
    for (const angleRad of [-0.2, -0.02, 0, 0.02, 0.2]) {
      const offset: Vector3 = [0, Math.sin(angleRad), -Math.cos(angleRad)];
      const direction = writeChaseDirection(offset, passNormal, [0, 0, 0]);
      expect(direction[0]).toBeCloseTo(Math.sin(CHASE_ELEVATION_RAD), 12);
    }
  });

  it('looks straight along the line when the line is along the pass normal', () => {
    expect(writeChaseDirection([0, 0, 1e-3], [0, 0, 1], [0, 0, 0])).toEqual([0, 0, 1]);
  });
});

describe('writeDirectionBlend', () => {
  const fromDirection: Vector3 = [1, 0, 0];
  const toDirection: Vector3 = [0, 1, 0];

  it('starts at the first direction and ends at the second, exactly', () => {
    expect(writeDirectionBlend({ fromDirection, toDirection, eased: 0 }, [0, 0, 0])).toEqual(
      fromDirection,
    );
    expect(writeDirectionBlend({ fromDirection, toDirection, eased: 1 }, [0, 0, 0])).toEqual(
      toDirection,
    );
  });

  it('stays a unit vector between them', () => {
    const midway = writeDirectionBlend({ fromDirection, toDirection, eased: 0.5 }, [0, 0, 0]);
    expect(norm(midway)).toBeCloseTo(1, 15);
    expect(midway[0]).toBeCloseTo(Math.SQRT1_2, 15);
    expect(midway[1]).toBeCloseTo(Math.SQRT1_2, 15);
  });

  it('takes the target direction when the two are opposite', () => {
    const opposite: Vector3 = [-1, 0, 0];
    const blend = { fromDirection, toDirection: opposite, eased: 0.5 };
    expect(writeDirectionBlend(blend, [0, 0, 0])).toEqual(opposite);
  });

  it('turns at a constant rate, even between nearly opposite directions', () => {
    const angleRad = (170 * Math.PI) / 180;
    const nearlyOpposite: Vector3 = [Math.cos(angleRad), Math.sin(angleRad), 0];
    for (const eased of [0.25, 0.5, 0.75]) {
      const blend = { fromDirection, toDirection: nearlyOpposite, eased };
      const blended = writeDirectionBlend(blend, [0, 0, 0]);
      expect(Math.acos(dot(blended, fromDirection))).toBeCloseTo(eased * angleRad, 9);
    }
  });
});

describe('writeDifference', () => {
  it('subtracts the second vector from the first', () => {
    expect(writeDifference([3, 2, 1], [1, 1, 1], [0, 0, 0])).toEqual([2, 1, 0]);
  });
});
