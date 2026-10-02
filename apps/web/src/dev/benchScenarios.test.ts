import { describe, expect, it, vi } from 'vitest';
import { closeApproachRow } from '../test/closeApproachRow';
import { cmeRow, cmeRowWithAnalysis } from '../test/cmeRow';
import {
  type BenchData,
  benchCme,
  benchShot,
  closestApproach,
  parseBenchRequest,
  TOUR_SECONDS,
  TOUR_STEPS,
  tourStepsDue,
} from './benchScenarios';

const NEAR = closeApproachRow({ designation: '2026 SA8', distanceAu: 0.0025 });
const FAR = closeApproachRow({ designation: '2019 AS2', distanceAu: 0.0115 });
const OLD_WITH_ARRIVAL = cmeRow({ activityId: 'old', startTime: '2026-09-01T00:00:00.000Z' });
const NEW_WITH_ARRIVAL = cmeRow({ activityId: 'new', startTime: '2026-09-20T00:00:00.000Z' });
const NEWEST_WITHOUT_ARRIVAL = {
  ...cmeRowWithAnalysis({ earthArrival: null }),
  activityId: 'newest',
  startTime: '2026-09-30T00:00:00.000Z',
};

function fakeTargets() {
  const calls: string[] = [];
  const record = (name: string) =>
    vi.fn<(...args: unknown[]) => void>(() => {
      calls.push(name);
    });
  const targets = {
    camera: { flyTo: record('flyTo') },
    time: {
      jumpToNow: record('jumpToNow'),
      setRate: record('setRate'),
      setPlaying: record('setPlaying'),
    },
    playApproach: record('playApproach'),
    watchEruption: record('watchEruption'),
  };
  return { calls, targets };
}

const DATA: BenchData = { approaches: [FAR, NEAR], cmes: [OLD_WITH_ARRIVAL, NEW_WITH_ARRIVAL] };

describe('parseBenchRequest', () => {
  it.each(['overview', 'earth', 'approach', 'eruption', 'tour'] as const)(
    'reads %s',
    (scenario) => {
      expect(parseBenchRequest(`?bench=${scenario}&dpr=2`)).toEqual({ scenario });
    },
  );

  it.each(['', '?bench=', '?bench=sun', '?dpr=2'])('has no request for %j', (search) => {
    expect(parseBenchRequest(search)).toBeUndefined();
  });
});

describe('closestApproach', () => {
  it('picks the smallest CAD distance', () => {
    expect(closestApproach([FAR, NEAR])).toBe(NEAR);
  });

  it('has none for an empty list', () => {
    expect(closestApproach([])).toBeUndefined();
  });
});

describe('benchCme', () => {
  it('picks the latest CME with an ENLIL Earth arrival', () => {
    expect(benchCme([OLD_WITH_ARRIVAL, NEWEST_WITHOUT_ARRIVAL, NEW_WITH_ARRIVAL])).toBe(
      NEW_WITH_ARRIVAL,
    );
  });

  it('falls back to the latest CME when none has an arrival', () => {
    const older = { ...NEWEST_WITHOUT_ARRIVAL, startTime: '2026-09-02T00:00:00.000Z' };
    expect(benchCme([older, NEWEST_WITHOUT_ARRIVAL])).toBe(NEWEST_WITHOUT_ARRIVAL);
  });

  it('has none for an empty list', () => {
    expect(benchCme([])).toBeUndefined();
  });
});

describe('benchShot', () => {
  it.each([
    ['overview', 'sun'],
    ['earth', 'earthMoonBarycenter'],
  ] as const)('%s plays the clock from now at 1 d/s and flies to the %s', (scenario, focus) => {
    const { calls, targets } = fakeTargets();
    const shot = benchShot(scenario, { data: DATA, targets });
    shot?.start();
    expect(shot?.subject).toBe(focus);
    expect(calls).toEqual(['jumpToNow', 'setRate', 'setPlaying', 'flyTo']);
    expect(targets.time.setRate).toHaveBeenCalledWith(1);
    expect(targets.camera.flyTo).toHaveBeenCalledWith({ focus });
  });

  it('plays the closest approach', () => {
    const { targets } = fakeTargets();
    const shot = benchShot('approach', { data: DATA, targets });
    shot?.start();
    expect(shot?.subject).toBe('2026 SA8');
    expect(targets.playApproach).toHaveBeenCalledWith(NEAR);
  });

  it('watches the chosen eruption', () => {
    const { targets } = fakeTargets();
    const shot = benchShot('eruption', { data: DATA, targets });
    shot?.start();
    expect(shot?.subject).toBe('new');
    expect(targets.watchEruption).toHaveBeenCalledWith(NEW_WITH_ARRIVAL);
  });

  it('has no shot without data to play', () => {
    const { targets } = fakeTargets();
    const empty = { data: { approaches: [], cmes: [] }, targets };
    expect(benchShot('approach', empty)).toBeUndefined();
    expect(benchShot('eruption', empty)).toBeUndefined();
  });
});

describe('tourStepsDue', () => {
  it('starts the first step on the first frame', () => {
    expect(tourStepsDue(0, 0.016)).toEqual([TOUR_STEPS[0]]);
  });

  it('starts each step once, on the frame that reaches it', () => {
    const due = TOUR_STEPS.slice(1).map((step) =>
      tourStepsDue(step.atSeconds - 0.01, step.atSeconds + 0.01),
    );
    expect(due).toEqual(TOUR_STEPS.slice(1).map((step) => [step]));
    expect(tourStepsDue(0.016, 0.032)).toEqual([]);
  });

  it('visits every measured scenario in order and ends after the last', () => {
    expect(TOUR_STEPS.map((step) => step.scenario)).toEqual([
      'overview',
      'earth',
      'approach',
      'eruption',
    ]);
    expect(TOUR_SECONDS).toBeGreaterThan(TOUR_STEPS.at(-1)?.atSeconds ?? Infinity);
  });
});
