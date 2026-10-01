import { describe, expect, it } from 'vitest';
import { arrivalText, cmeUtcText, directionText } from './cmeFormat';

const ARRIVAL = {
  predictedTime: '2026-09-29T18:00:00.000Z',
  isGlancingBlow: false,
  isMinorImpact: false,
};

describe('cmeUtcText', () => {
  it('prints DONKI UTC to the minute', () => {
    expect(cmeUtcText('2026-09-02T00:08:00.000Z')).toBe('Sep 2 · 00:08 UTC');
  });
});

describe('directionText', () => {
  it('writes latitude N/S and longitude W positive, as DONKI', () => {
    expect(directionText({ latitudeDeg: -12, longitudeDeg: 7 })).toBe('S12 W07');
    expect(directionText({ latitudeDeg: 5, longitudeDeg: -50 })).toBe('N05 E50');
  });

  it('reads the sign after rounding, so a value that rounds to 0 is N00 / W00', () => {
    expect(directionText({ latitudeDeg: -0.4, longitudeDeg: -0.4 })).toBe('N00 W00');
  });
});

describe('arrivalText', () => {
  it("shows ENLIL's arrival with its flags", () => {
    expect(arrivalText({ earthArrival: ARRIVAL, enlilRunCount: 1 })).toBe(
      'ENLIL predicts Earth arrival Sep 29 · 18:00 UTC',
    );
    const glancing = { ...ARRIVAL, isGlancingBlow: true, isMinorImpact: true };
    expect(arrivalText({ earthArrival: glancing, enlilRunCount: 1 })).toBe(
      'ENLIL predicts Earth arrival Sep 29 · 18:00 UTC · glancing blow · minor impact',
    );
  });

  it('tells a run without an arrival from no run at all', () => {
    expect(arrivalText({ earthArrival: null, enlilRunCount: 3 })).toBe(
      'ENLIL: no Earth arrival predicted',
    );
    expect(arrivalText({ earthArrival: null, enlilRunCount: 0 })).toBe('No ENLIL run for this CME');
  });
});
