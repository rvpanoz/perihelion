import { describe, expect, it, vi } from 'vitest';
import { closeApproachRow } from '../test/closeApproachRow';
import { cmeRow } from '../test/cmeRow';
import { type ShotTargets, chooseApproach, chooseCme } from './shotSelection';

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
