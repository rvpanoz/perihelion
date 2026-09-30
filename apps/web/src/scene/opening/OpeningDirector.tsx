import { useFrame } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { type TimeStore, timeStore } from '../../time/timeStore';
import { type CameraRig, cameraRig } from '../camera/cameraRig';
import { FRAME_PRIORITY } from '../framePriorities';
import { browserSkipsOpeningMove, listenForSkip } from './openingSkip';
import { type OpeningStore, openingStore } from './openingStore';
import {
  OPENING_FINAL_RATE_DAYS_PER_SECOND,
  OPENING_OVERVIEW_DISTANCE_AU,
  OPENING_SECONDS,
  OPENING_START_RATE_DAYS_PER_SECOND,
  openingRateDaysPerSecond,
} from './openingTimeline';

/** Everything the opening drives or reads; injected because the web tests have no DOM and fake the clock. */
export interface OpeningScript {
  rig: CameraRig;
  time: TimeStore;
  store: OpeningStore;
  nowSeconds: () => number;
  skipsMove: boolean;
  skipTarget: EventTarget;
}

type Stage = 'waiting' | 'atEarth' | 'flying' | 'done';

const SUN_OVERVIEW = { focus: 'sun', distanceAu: OPENING_OVERVIEW_DISTANCE_AU } as const;

/**
 * The opening as a frame-driven sequence. `flyTo` reads its start pose when called, so the snap to Earth and the
 * flight to the Sun go on consecutive frames. The ramp reads the same wall clock as the flight, so rate and camera
 * finish together even when frames drop.
 */
class OpeningSequence {
  #stage: Stage;
  #flightStartSeconds = 0;
  #skipRequested = false;

  constructor(readonly script: OpeningScript) {
    // Plays once per page load: a remount after the opening finds the shared store already done.
    this.#stage = script.store.phase === 'waiting' ? 'waiting' : 'done';
  }

  requestSkip = (): void => {
    this.#skipRequested = true;
  };

  advance(canStart: boolean, precompile: () => void): void {
    if (this.#stage === 'done') return;
    if (this.#skipRequested || (canStart && this.script.skipsMove)) return this.#skip();
    if (this.#stage === 'waiting' && canStart) this.#start(precompile);
    else if (this.#stage === 'atEarth') this.#launch();
    else if (this.#stage === 'flying') this.#ramp();
  }

  #start(precompile: () => void): void {
    const { rig, time, store } = this.script;
    precompile();
    time.jumpToNow();
    time.setScriptedRate(OPENING_START_RATE_DAYS_PER_SECOND);
    rig.flyTo({ focus: 'earthMoonBarycenter', durationSeconds: 0 });
    store.setPhase('playing');
    this.#stage = 'atEarth';
  }

  #launch(): void {
    this.script.rig.flyTo({ ...SUN_OVERVIEW, durationSeconds: OPENING_SECONDS });
    this.#flightStartSeconds = this.script.nowSeconds();
    this.#stage = 'flying';
  }

  #ramp(): void {
    const elapsedSeconds = this.script.nowSeconds() - this.#flightStartSeconds;
    this.script.time.setScriptedRate(openingRateDaysPerSecond(elapsedSeconds));
    if (elapsedSeconds >= OPENING_SECONDS) this.#finish();
  }

  #skip(): void {
    this.script.rig.flyTo({ ...SUN_OVERVIEW, durationSeconds: 0 });
    this.#finish();
  }

  /** `setRate` clamps and notifies once, so the speed slider syncs to the final rate. */
  #finish(): void {
    this.script.time.setRate(OPENING_FINAL_RATE_DAYS_PER_SECOND);
    this.script.store.setPhase('done');
    this.#stage = 'done';
  }
}

function browserOpeningScript(): OpeningScript {
  return {
    rig: cameraRig,
    time: timeStore,
    store: openingStore,
    nowSeconds: () => performance.now() / 1000,
    skipsMove: browserSkipsOpeningMove(),
    skipTarget: window,
  };
}

/**
 * Pulls back from Earth to the swarm while time speeds up. `canStart` waits for the NEO catalog to settle, since the
 * reveal needs the swarm. Shaders compile before the move so the first frames of the flight don't stall.
 */
export function OpeningDirector({
  canStart,
  script,
}: {
  canStart: boolean;
  script?: OpeningScript;
}) {
  const [sequence] = useState(() => new OpeningSequence(script ?? browserOpeningScript()));
  useEffect(() => listenForSkip(sequence.script.skipTarget, sequence.requestSkip), [sequence]);
  useFrame(({ gl, scene, camera }) => {
    sequence.advance(canStart, () => gl.compile(scene, camera));
  }, FRAME_PRIORITY.opening);
  return null;
}
