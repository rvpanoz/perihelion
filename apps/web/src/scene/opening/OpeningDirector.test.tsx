import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { jdTdbFromUnixMs } from '../../time/timeController';
import { TimeStore } from '../../time/timeStore';
import { CameraRig } from '../camera/cameraRig';
import { OpeningDirector, type OpeningScript } from './OpeningDirector';
import { OpeningStore } from './openingStore';
import {
  OPENING_FINAL_RATE_DAYS_PER_SECOND,
  OPENING_OVERVIEW_DISTANCE_AU,
  OPENING_SECONDS,
  OPENING_START_RATE_DAYS_PER_SECOND,
  openingRateDaysPerSecond,
} from './openingTimeline';

const FRAME_SECONDS = 1 / 60;
const J2000_JD_TDB = 2_451_545;
const NOW_UNIX_MS = Date.UTC(2026, 9, 1);
const SUN_OVERVIEW_SNAP = {
  focus: 'sun',
  distanceAu: OPENING_OVERVIEW_DISTANCE_AU,
  durationSeconds: 0,
};

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

function setUp(overrides: Partial<OpeningScript> = {}) {
  const clock = { nowSeconds: 100 };
  const script: OpeningScript = {
    rig: new CameraRig({ initialDistanceAu: 3, nowSeconds: () => clock.nowSeconds }),
    time: new TimeStore({
      initial: { jdTdb: J2000_JD_TDB, rateDaysPerSecond: 1, playing: true },
      nowUnixMs: () => NOW_UNIX_MS,
    }),
    store: new OpeningStore(),
    nowSeconds: () => clock.nowSeconds,
    skipsMove: false,
    skipTarget: new EventTarget(),
    ...overrides,
  };
  const flyTo = vi.spyOn(script.rig, 'flyTo');
  return { clock, script, flyTo };
}

/** The fake wall clock moves with the frames, as `performance.now` would. */
async function advanceFrames(renderer: Renderer, clock: { nowSeconds: number }, frames: number) {
  for (let frame = 0; frame < frames; frame += 1) {
    clock.nowSeconds += FRAME_SECONDS;
    await ReactThreeTestRenderer.act(() => renderer.advanceFrames(1, FRAME_SECONDS));
  }
}

const FRAMES_TO_FINISH = Math.ceil(OPENING_SECONDS / FRAME_SECONDS) + 3;

describe('OpeningDirector', () => {
  it('waits while the catalog is loading', async () => {
    const { clock, script, flyTo } = setUp();
    const renderer = await ReactThreeTestRenderer.create(
      <OpeningDirector canStart={false} script={script} />,
    );
    await advanceFrames(renderer, clock, 10);
    expect(flyTo).not.toHaveBeenCalled();
    expect(script.store.phase).toBe('waiting');

    await renderer.update(<OpeningDirector canStart script={script} />);
    await advanceFrames(renderer, clock, 1);
    expect(script.store.phase).toBe('playing');
    await renderer.unmount();
  });

  it('starts at Earth, now, in real time', async () => {
    const { clock, script, flyTo } = setUp();
    const renderer = await ReactThreeTestRenderer.create(
      <OpeningDirector canStart script={script} />,
    );
    await advanceFrames(renderer, clock, 1);
    expect(flyTo).toHaveBeenCalledExactlyOnceWith({
      focus: 'earthMoonBarycenter',
      durationSeconds: 0,
    });
    expect(script.time.state.jdTdb).toBe(jdTdbFromUnixMs(NOW_UNIX_MS));
    expect(script.time.state.rateDaysPerSecond).toBe(OPENING_START_RATE_DAYS_PER_SECOND);
    await renderer.unmount();
  });

  it('asks for exactly one flight to the Sun overview', async () => {
    const { clock, script, flyTo } = setUp();
    const renderer = await ReactThreeTestRenderer.create(
      <OpeningDirector canStart script={script} />,
    );
    await advanceFrames(renderer, clock, FRAMES_TO_FINISH);
    const sunFlights = flyTo.mock.calls.filter(([request]) => request.focus === 'sun');
    expect(sunFlights).toEqual([
      [
        {
          focus: 'sun',
          distanceAu: OPENING_OVERVIEW_DISTANCE_AU,
          durationSeconds: OPENING_SECONDS,
        },
      ],
    ]);
    expect(script.store.phase).toBe('done');
    await renderer.unmount();
  });

  it('follows the rate timeline frame by frame, without a React commit', async () => {
    const { clock, script } = setUp();
    let commits = 0;
    const renderer = await ReactThreeTestRenderer.create(
      <Profiler id="opening" onRender={() => (commits += 1)}>
        <OpeningDirector canStart script={script} />
      </Profiler>,
    );
    await advanceFrames(renderer, clock, 2);
    const flightStartSeconds = clock.nowSeconds;
    commits = 0;
    for (let frame = 0; frame < FRAMES_TO_FINISH; frame += 1) {
      await advanceFrames(renderer, clock, 1);
      const expected = openingRateDaysPerSecond(clock.nowSeconds - flightStartSeconds);
      expect(script.time.state.rateDaysPerSecond).toBeCloseTo(expected, 9);
    }
    expect(script.time.state.rateDaysPerSecond).toBe(OPENING_FINAL_RATE_DAYS_PER_SECOND);
    expect(commits).toBe(0);
    await renderer.unmount();
  });

  it('ends at the final state on a keydown mid-way', async () => {
    const { clock, script, flyTo } = setUp();
    const renderer = await ReactThreeTestRenderer.create(
      <OpeningDirector canStart script={script} />,
    );
    await advanceFrames(renderer, clock, Math.floor(FRAMES_TO_FINISH / 2));
    script.skipTarget.dispatchEvent(new Event('keydown'));
    await advanceFrames(renderer, clock, 1);
    expect(flyTo).toHaveBeenLastCalledWith(SUN_OVERVIEW_SNAP);
    expect(script.time.state.rateDaysPerSecond).toBe(OPENING_FINAL_RATE_DAYS_PER_SECOND);
    expect(script.store.phase).toBe('done');
    await renderer.unmount();
  });

  it('skips the move under reduced motion', async () => {
    const { clock, script, flyTo } = setUp({ skipsMove: true });
    const renderer = await ReactThreeTestRenderer.create(
      <OpeningDirector canStart script={script} />,
    );
    await advanceFrames(renderer, clock, 1);
    expect(flyTo).toHaveBeenCalledExactlyOnceWith(SUN_OVERVIEW_SNAP);
    expect(script.time.state.rateDaysPerSecond).toBe(OPENING_FINAL_RATE_DAYS_PER_SECOND);
    expect(script.store.phase).toBe('done');
    await renderer.unmount();
  });

  it('does not replay after it has finished, even when remounted', async () => {
    const { clock, script, flyTo } = setUp();
    const renderer = await ReactThreeTestRenderer.create(
      <OpeningDirector canStart script={script} />,
    );
    await advanceFrames(renderer, clock, FRAMES_TO_FINISH);
    await renderer.unmount();
    const flightsBefore = flyTo.mock.calls.length;

    const remounted = await ReactThreeTestRenderer.create(
      <OpeningDirector canStart script={script} />,
    );
    await advanceFrames(remounted, clock, 60);
    script.skipTarget.dispatchEvent(new Event('keydown'));
    await advanceFrames(remounted, clock, 1);
    expect(flyTo).toHaveBeenCalledTimes(flightsBefore);
    await remounted.unmount();
  });
});
