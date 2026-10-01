import type { Cme } from '@perihelion/data';
import type { CameraRig } from '../camera/cameraRig';
import type { TimeStore } from '../../time/timeStore';
import { type EruptionShot, beatIndexAt } from './eruptionShot';

/** Everything the shot drives or reads; injected so tests can fake the stores. */
export interface EruptionScript {
  rig: Pick<CameraRig, 'flyTo'>;
  time: Pick<TimeStore, 'state' | 'setScriptedRate' | 'setPlaying'>;
  selectedCme: () => Cme | undefined;
}

interface RunningShot {
  cme: Cme;
  shot: EruptionShot;
  beatIndex: number;
}

/**
 * The eruption shot as a frame-driven sequence on the simulation clock: entering a beat sets its rate and flies its
 * camera. It ends at the shot's end (the clock pauses there) and hands control back if the viewer pauses, scrubs
 * out of the shot or picks something else.
 */
export class EruptionSequence {
  #running: RunningShot | undefined;

  constructor(readonly script: EruptionScript) {}

  get running(): boolean {
    return this.#running !== undefined;
  }

  start(cme: Cme, shot: EruptionShot): void {
    this.#running = { cme, shot, beatIndex: -1 };
  }

  stop(): void {
    this.#running = undefined;
  }

  advance(): void {
    const running = this.#running;
    if (!running) return;
    const { jdTdb, playing } = this.script.time.state;
    if (!playing || this.script.selectedCme() !== running.cme) return this.stop();
    const index = beatIndexAt(running.shot, jdTdb);
    if (index === -1) return this.#leave(jdTdb >= running.shot.endJdTdb);
    if (index !== running.beatIndex) this.#enter(running, index);
  }

  #enter(running: RunningShot, index: number): void {
    const beat = running.shot.beats[index];
    if (!beat) return;
    running.beatIndex = index;
    this.script.time.setScriptedRate(beat.rateDaysPerSecond);
    this.script.rig.flyTo(beat.camera);
  }

  /** Past the end the clock stops on the last frame; before the start (a scrub back) the viewer has taken over. */
  #leave(finished: boolean): void {
    if (finished) this.script.time.setPlaying(false);
    this.stop();
  }
}
