import type { Cme } from '@perihelion/data';
import { eruptionSequence } from '../scene/eruption/eruptionSequence';
import { type EruptionShot, eruptionShot } from '../scene/eruption/eruptionShot';
import { chooseCme } from '../shell/shotSelection';
import { type TimeStore, timeStore } from '../time/timeStore';

/** What Watch eruption drives: the app's stores by default, fakes in tests. */
export interface WatchTargets {
  choose: (cme: Cme) => void;
  time: Pick<TimeStore, 'scrubTo' | 'setRate' | 'setPlaying'>;
  sequence: { start(cme: Cme, shot: EruptionShot): void };
}

const APP_TARGETS: WatchTargets = {
  choose: (cme) => chooseCme(cme),
  time: timeStore,
  sequence: eruptionSequence,
};

/**
 * Selects the CME, sets the clock to an hour before it leaves the Sun at the first beat's rate, and starts the shot;
 * the director flies the camera as the clock enters each beat.
 */
export function watchEruption(cme: Cme, targets = APP_TARGETS): void {
  targets.choose(cme);
  const shot = eruptionShot(cme);
  targets.time.scrubTo(shot.startJdTdb);
  targets.time.setRate(shot.beats[0]?.rateDaysPerSecond ?? 1);
  targets.time.setPlaying(true);
  targets.sequence.start(cme, shot);
}
