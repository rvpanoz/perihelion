import { describe, expect, it, vi } from 'vitest';
import { approachPlayback, followDistanceAu } from '../scene/approach/approachCamera';
import type { FocusId } from '../scene/camera/focusPositions';
import { closeApproachRow } from '../test/closeApproachRow';
import { clearApproach, followApproach, playApproach, selectApproach } from './playApproach';

function fakeTargets(focus: FocusId = 'sun') {
  const calls: string[] = [];
  const record = (name: string) =>
    vi.fn<(...args: unknown[]) => void>(() => {
      calls.push(name);
    });
  const targets = {
    selection: { select: record('select'), clear: record('clear') },
    time: {
      scrubTo: record('scrubTo'),
      setRate: record('setRate'),
      setPlaying: record('setPlaying'),
    },
    camera: { focus, flyTo: record('flyTo') },
  };
  return { calls, targets };
}

describe('followApproach', () => {
  it('selects the row and flies a chase to it, leaving the clock alone', () => {
    const row = closeApproachRow();
    const { calls, targets } = fakeTargets();
    followApproach(row, targets);
    expect(calls).toEqual(['select', 'flyTo']);
    expect(targets.selection.select).toHaveBeenCalledWith(row);
    expect(targets.camera.flyTo).toHaveBeenCalledWith({
      focus: 'asteroid',
      distanceAu: followDistanceAu(row),
      chase: true,
    });
  });
});

describe('playApproach', () => {
  it('selects the row, sets the clock to the pass, plays, then follows', () => {
    const row = closeApproachRow();
    const playback = approachPlayback(row);
    const { calls, targets } = fakeTargets();
    playApproach(row, targets);
    expect(calls).toEqual(['select', 'scrubTo', 'setRate', 'setPlaying', 'flyTo']);
    expect(targets.time.scrubTo).toHaveBeenCalledWith(playback.startJdTdb);
    expect(targets.time.setRate).toHaveBeenCalledWith(playback.rateDaysPerSecond);
    expect(targets.time.setPlaying).toHaveBeenCalledWith(true);
  });

  it('moves the clock back for a pass already over (Review Focus 4)', () => {
    const row = { ...closeApproachRow(), approachJdTdb: 2_461_000.5 };
    const { targets } = fakeTargets();
    playApproach(row, targets);
    const [startJdTdb] = targets.time.scrubTo.mock.lastCall ?? [];
    expect(startJdTdb).toBeLessThan(row.approachJdTdb);
  });
});

describe('selectApproach', () => {
  it('only selects while the camera is elsewhere', () => {
    const { calls, targets } = fakeTargets('earthMoonBarycenter');
    selectApproach(closeApproachRow(), targets);
    expect(calls).toEqual(['select']);
  });

  it('follows the new row when the camera is on the asteroid, so it flies instead of jumping', () => {
    const row = closeApproachRow();
    const { calls, targets } = fakeTargets('asteroid');
    selectApproach(row, targets);
    expect(calls).toEqual(['select', 'flyTo']);
    expect(targets.camera.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ focus: 'asteroid', chase: true }),
    );
  });
});

describe('clearApproach', () => {
  it('only clears while the camera is elsewhere', () => {
    const { calls, targets } = fakeTargets('mars');
    clearApproach(targets);
    expect(calls).toEqual(['clear']);
  });

  it('flies back to Earth when the camera was on the asteroid', () => {
    const { calls, targets } = fakeTargets('asteroid');
    clearApproach(targets);
    expect(calls).toEqual(['clear', 'flyTo']);
    expect(targets.camera.flyTo).toHaveBeenCalledWith({ focus: 'earthMoonBarycenter' });
  });
});
