import { describe, expect, it, vi } from 'vitest';
import { eruptionShot } from '../scene/eruption/eruptionShot';
import { cmeRow } from '../test/cmeRow';
import { watchEruption } from './watchEruption';

describe('watchEruption', () => {
  it('selects the CME, sets the clock to the shot start at the first beat’s rate, plays and starts the shot', () => {
    const cme = cmeRow();
    const shot = eruptionShot(cme);
    const targets = {
      choose: vi.fn(),
      time: { scrubTo: vi.fn(), setRate: vi.fn(), setPlaying: vi.fn() },
      sequence: { start: vi.fn() },
    };
    watchEruption(cme, targets);
    expect(targets.choose).toHaveBeenCalledWith(cme);
    expect(targets.time.scrubTo).toHaveBeenCalledWith(shot.startJdTdb);
    expect(targets.time.setRate).toHaveBeenCalledWith(shot.beats[0]?.rateDaysPerSecond);
    expect(targets.time.setPlaying).toHaveBeenCalledWith(true);
    expect(targets.sequence.start).toHaveBeenCalledWith(cme, shot);
  });
});
