import type { CloseApproach, Cme } from '@perihelion/data';
import { describe, expect, it, vi } from 'vitest';
import { closeApproachRow } from '../test/closeApproachRow';
import { cmeRow } from '../test/cmeRow';
import { approachKey } from '../approaches/approachKey';
import { SelectionStore } from '../state/selectionStore';
import {
  type KeepShotTargets,
  type ShotTargets,
  chooseApproach,
  chooseCme,
  keepShotsIn,
} from './shotSelection';

function fakeTargets(calls: string[]): ShotTargets {
  return {
    cmes: {
      select: vi.fn(() => calls.push('select CME')),
      clear: vi.fn(() => calls.push('clear CME')),
    },
    selectApproach: vi.fn(() => calls.push('select approach')),
    clearApproach: vi.fn(() => calls.push('clear approach')),
  };
}

describe('shot selection', () => {
  it('clears the CME before selecting an approach', () => {
    const calls: string[] = [];
    chooseApproach(closeApproachRow(), fakeTargets(calls));
    expect(calls).toEqual(['clear CME', 'select approach']);
  });

  it('clears the approach before selecting a CME', () => {
    const calls: string[] = [];
    const targets = fakeTargets(calls);
    const cme = cmeRow();
    chooseCme(cme, targets);
    expect(calls).toEqual(['clear approach', 'select CME']);
    expect(targets.cmes.select).toHaveBeenCalledWith(cme);
  });
});

describe('keepShotsIn (live data replaces the snapshot)', () => {
  function storesWith(approach = closeApproachRow(), cme = cmeRow()) {
    const approaches = new SelectionStore<CloseApproach>();
    const cmes = new SelectionStore<Cme>();
    approaches.select(approach);
    cmes.select(cme);
    const targets: KeepShotTargets = { approaches, cmes, clearApproach: vi.fn() };
    return { approaches, cmes, targets };
  }

  it('keeps the selected approach and CME, now pointing at the live rows', () => {
    const { approaches, cmes, targets } = storesWith();
    const liveApproach = closeApproachRow({ distanceAu: 0.0123 });
    const liveCme = cmeRow();
    keepShotsIn({ approaches: [liveApproach], cmes: [liveCme] }, targets);
    expect(approachKey(liveApproach)).toBe(approachKey(closeApproachRow()));
    expect(approaches.selected).toBe(liveApproach);
    expect(cmes.selected).toBe(liveCme);
    expect(targets.clearApproach).not.toHaveBeenCalled();
  });

  it('clears an approach the live list no longer has, through clearApproach (the camera may follow it)', () => {
    const { targets } = storesWith();
    keepShotsIn({ approaches: [closeApproachRow({ designation: '2026 QA1' })] }, targets);
    expect(targets.clearApproach).toHaveBeenCalledOnce();
  });

  it('clears a CME the live list no longer has', () => {
    const { cmes, targets } = storesWith();
    keepShotsIn({ cmes: [cmeRow({ activityId: '2026-10-01T00:00:00-CME-001' })] }, targets);
    expect(cmes.selected).toBeUndefined();
  });

  it('leaves a selection alone while its list has not loaded', () => {
    const { approaches, cmes, targets } = storesWith();
    const before = { approach: approaches.selected, cme: cmes.selected };
    keepShotsIn({}, targets);
    expect({ approach: approaches.selected, cme: cmes.selected }).toEqual(before);
  });
});
