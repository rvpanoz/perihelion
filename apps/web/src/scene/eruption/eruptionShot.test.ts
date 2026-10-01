import { SOLAR_RADIUS_AU, type Vector3, cross, dot, norm } from '@perihelion/orbit';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { jdTdbFromIso } from '../../eruptions/cmeGeometry';
import { cmeRow, cmeRowWithAnalysis } from '../../test/cmeRow';
import { cmeShellMotion, cmeShellState, earthDistanceAu } from './cmeShellTiming';
import { ERUPTION_SHOT, beatIndexAt, eruptionShot, frontTimeJdTdb, sideView } from './eruptionShot';

const withArrival = cmeRow();
const arrivalJdTdb = jdTdbFromIso(withArrival.analysis.earthArrival?.predictedTime ?? '');

describe('eruptionShot', () => {
  const shot = eruptionShot(withArrival);

  it('plays burst, cruise and impact back to back, from an hour before launch', () => {
    expect(shot.beats.map((beat) => beat.name)).toEqual(['burst', 'cruise', 'impact']);
    const launchJdTdb = frontTimeJdTdb(cmeShellMotion(withArrival), SOLAR_RADIUS_AU);
    expect(shot.startJdTdb).toBeCloseTo(launchJdTdb - ERUPTION_SHOT.leadDays, 9);
    for (const [index, beat] of shot.beats.entries()) {
      expect(beat.endJdTdb).toBeGreaterThan(beat.startJdTdb);
      if (index > 0) expect(beat.startJdTdb).toBe(shot.beats[index - 1]?.endJdTdb);
    }
    expect(shot.endJdTdb).toBe(shot.beats.at(-1)?.endJdTdb);
  });

  it("brackets ENLIL's arrival in the impact beat, at Earth", () => {
    const impact = shot.beats[2];
    expect(impact?.startJdTdb).toBeCloseTo(arrivalJdTdb - ERUPTION_SHOT.impact.leadDays, 9);
    expect(impact?.endJdTdb).toBeCloseTo(arrivalJdTdb + ERUPTION_SHOT.impact.trailDays, 9);
    expect(impact?.camera.focus).toBe('earthMoonBarycenter');
  });

  it('plays each beat in its real seconds', () => {
    const seconds = [
      ERUPTION_SHOT.burst.seconds,
      ERUPTION_SHOT.cruise.seconds,
      ERUPTION_SHOT.impact.seconds,
    ];
    for (const [index, beat] of shot.beats.entries()) {
      expect((beat.endJdTdb - beat.startJdTdb) / beat.rateDaysPerSecond).toBeCloseTo(
        seconds[index] ?? 0,
        9,
      );
    }
  });

  it('ends the burst with the front at its framing distance', () => {
    const motion = cmeShellMotion(withArrival);
    const burstEnd = shot.beats[0]?.endJdTdb ?? Number.NaN;
    // JDs near 2.46e6 are resolved to ~5e-10 day, so the round trip through a time is good to ~1e-10 AU.
    expect(cmeShellState(motion, burstEnd).frontDistanceAu).toBeCloseTo(
      ERUPTION_SHOT.burst.untilFrontAu,
      9,
    );
  });

  it('without an ENLIL arrival, ends after the cruise with the front past Earth', () => {
    const cme = cmeRowWithAnalysis({ earthArrival: null });
    const noArrival = eruptionShot(cme);
    expect(noArrival.beats.map((beat) => beat.name)).toEqual(['burst', 'cruise']);
    const motion = cmeShellMotion(cme);
    const frontAtEnd = cmeShellState(motion, noArrival.endJdTdb).frontDistanceAu;
    expect(frontAtEnd).toBeCloseTo(
      earthDistanceAu(motion.time21_5JdTdb) + ERUPTION_SHOT.pastEarthAu,
      9,
    );
  });
});

describe('beatIndexAt', () => {
  const shot = eruptionShot(withArrival);

  it('finds the beat the clock is in, and −1 outside the shot', () => {
    expect(beatIndexAt(shot, shot.startJdTdb)).toBe(0);
    expect(beatIndexAt(shot, arrivalJdTdb)).toBe(2);
    expect(beatIndexAt(shot, shot.startJdTdb - 1)).toBe(-1);
    expect(beatIndexAt(shot, shot.endJdTdb)).toBe(-1);
  });
});

describe('sideView', () => {
  const unitLine = fc
    .tuple(
      fc.double({ min: -1, max: 1 }),
      fc.double({ min: -1, max: 1 }),
      fc.double({ min: -1, max: 1 }),
    )
    .filter(([x, y, z]) => Math.hypot(x, y, z) > 0.1)
    .map((vector): Vector3 => vector);

  it('is a unit vector at exactly 90° from the line, raised toward north', () => {
    fc.assert(
      fc.property(unitLine, (line) => {
        const view = sideView(line, 0.4);
        expect(norm(view)).toBeCloseTo(1, 12);
        expect(dot(view, line) / norm(line)).toBeCloseTo(0, 12);
        // Raised: the view leans toward north as seen across the line (or toward x for a polar line).
        expect(norm(cross(view, line))).toBeGreaterThan(0);
      }),
    );
  });
});
