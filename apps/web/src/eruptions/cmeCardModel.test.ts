import { describe, expect, it } from 'vitest';
import { cmeRow, cmeRowWithAnalysis } from '../test/cmeRow';
import { cmeCard } from './cmeCardModel';

describe('cmeCard', () => {
  it("shows DONKI's figures and ENLIL's arrival", () => {
    const card = cmeCard(cmeRow());
    expect(card.subtitle).toBe('Sep 5 · 11:09 UTC');
    expect(card.badge).toBe('Earth arrival predicted');
    expect(card.stats.map((stat) => [stat.label, stat.value])).toEqual([
      ['Speed', '873 km/s'],
      ['Half-angle', '38°'],
      ['Direction', 'S12 W07'],
    ]);
    expect(card.stats[0]?.detail).toBe('at 21.5 R☉ · Sep 5 · 15:30 UTC');
    expect(card.arrival).toBe('ENLIL predicts Earth arrival Sep 7 · 21:31 UTC');
    expect(card.link).toBe('https://ccmc.gsfc.nasa.gov/DONKI/view/CME/48500/-1');
  });

  it('says when ENLIL never ran', () => {
    const card = cmeCard(cmeRowWithAnalysis({ earthArrival: null, enlilRunCount: 0 }));
    expect(card.arrival).toBe('No ENLIL run for this CME');
    expect(card.badge).not.toBe('Earth arrival predicted');
  });
});
