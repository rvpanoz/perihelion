import type { Cme } from '@perihelion/data';
import { describe, expect, it, vi } from 'vitest';
import { cmeRow } from '../../test/cmeRow';
import type { TimeState } from '../../time/timeController';
import { EruptionSequence } from './eruptionPlayback';
import { eruptionShot } from './eruptionShot';

function setup() {
  const cme = cmeRow();
  const shot = eruptionShot(cme);
  const state: TimeState = { jdTdb: shot.startJdTdb, rateDaysPerSecond: 1, playing: true };
  let selected: Cme | undefined = cme;
  const script = {
    rig: { flyTo: vi.fn() },
    time: {
      state,
      setScriptedRate: vi.fn((rate: number) => (state.rateDaysPerSecond = rate)),
      setPlaying: vi.fn((playing: boolean) => (state.playing = playing)),
    },
    selectedCme: () => selected,
  };
  const sequence = new EruptionSequence(script);
  sequence.start(cme, shot);
  return {
    cme,
    shot,
    state,
    script,
    sequence,
    select: (next: Cme | undefined) => (selected = next),
  };
}

describe('EruptionSequence', () => {
  it('sets the rate and flies the camera once on entering each beat', () => {
    const { shot, state, script, sequence } = setup();
    sequence.advance();
    sequence.advance();
    expect(script.rig.flyTo).toHaveBeenCalledOnce();
    expect(script.rig.flyTo).toHaveBeenLastCalledWith(shot.beats[0]?.camera);
    expect(state.rateDaysPerSecond).toBe(shot.beats[0]?.rateDaysPerSecond);
    state.jdTdb = shot.beats[1]?.startJdTdb ?? Number.NaN;
    sequence.advance();
    expect(script.rig.flyTo).toHaveBeenLastCalledWith(shot.beats[1]?.camera);
    expect(state.rateDaysPerSecond).toBe(shot.beats[1]?.rateDaysPerSecond);
  });

  it('pauses the clock at the end of the shot and stops', () => {
    const { shot, state, script, sequence } = setup();
    state.jdTdb = shot.endJdTdb;
    sequence.advance();
    expect(script.time.setPlaying).toHaveBeenCalledWith(false);
    expect(sequence.running).toBe(false);
  });

  it('hands control back when the viewer pauses, scrubs before the shot or picks something else', () => {
    const paused = setup();
    paused.state.playing = false;
    paused.sequence.advance();
    expect(paused.sequence.running).toBe(false);

    const scrubbed = setup();
    scrubbed.state.jdTdb = scrubbed.shot.startJdTdb - 1;
    scrubbed.sequence.advance();
    expect(scrubbed.sequence.running).toBe(false);
    expect(scrubbed.script.time.setPlaying).not.toHaveBeenCalled();

    const other = setup();
    other.select(undefined);
    other.sequence.advance();
    expect(other.sequence.running).toBe(false);
    expect(other.script.rig.flyTo).not.toHaveBeenCalled();
  });
});
