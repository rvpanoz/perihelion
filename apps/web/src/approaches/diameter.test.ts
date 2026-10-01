import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ALBEDO_RANGE,
  approachDiameter,
  diameterAtAlbedoKm,
  diameterLabel,
  diameterText,
  diameterValueText,
  estimatedDiameterRangeKm,
} from './diameter';

describe('diameterAtAlbedoKm', () => {
  it('follows D = 1329 km / √p · 10^(−H/5)', () => {
    // At H = 15, 10^(−15/5) = 1e-3: 1329 / √0.25 = 2658 km and 1329 / √0.05 = 5943.469 km.
    expect(diameterAtAlbedoKm(15, 0.25)).toBeCloseTo(2.658, 12);
    expect(diameterAtAlbedoKm(15, 0.05)).toBeCloseTo(5.943469, 6);
  });

  it('shrinks tenfold for every 5 magnitudes', () => {
    fc.assert(
      fc.property(fc.double({ min: 5, max: 30, noNaN: true }), (h) => {
        const ratio = diameterAtAlbedoKm(h, 0.14) / diameterAtAlbedoKm(h + 5, 0.14);
        expect(ratio).toBeCloseTo(10, 9);
      }),
    );
  });
});

describe('estimatedDiameterRangeKm', () => {
  it('runs from the bright (small) to the dark (large) albedo', () => {
    const range = estimatedDiameterRangeKm(15);
    expect(range.minKm).toBe(diameterAtAlbedoKm(15, ALBEDO_RANGE.bright));
    expect(range.maxKm).toBe(diameterAtAlbedoKm(15, ALBEDO_RANGE.dark));
    // √(0.25 / 0.05) = √5: every estimate spans the same factor.
    expect(range.maxKm / range.minKm).toBeCloseTo(Math.sqrt(5), 12);
  });
});

describe('approachDiameter', () => {
  it("prefers JPL's diameter, with its sigma", () => {
    const diameter = approachDiameter({
      diameterKm: 0.37,
      diameterSigmaKm: 0.02,
      absoluteMagnitude: 19.1,
    });
    expect(diameter).toEqual({ kind: 'jpl', diameterKm: 0.37, sigmaKm: 0.02 });
  });

  it('estimates a range from H when JPL has no diameter', () => {
    const diameter = approachDiameter({
      diameterKm: null,
      diameterSigmaKm: null,
      absoluteMagnitude: 15,
    });
    expect(diameter).toEqual({ kind: 'estimated', ...estimatedDiameterRangeKm(15) });
  });

  it('is unknown with neither', () => {
    const diameter = approachDiameter({
      diameterKm: null,
      diameterSigmaKm: null,
      absoluteMagnitude: null,
    });
    expect(diameter).toEqual({ kind: 'unknown' });
  });
});

describe('diameterValueText', () => {
  it("shows JPL's value unrounded, in metres below 1 km", () => {
    expect(diameterValueText({ kind: 'jpl', diameterKm: 0.37, sigmaKm: 0.02 })).toBe('370 ± 20 m');
    expect(diameterValueText({ kind: 'jpl', diameterKm: 0.0071, sigmaKm: null })).toBe('7.1 m');
    expect(diameterValueText({ kind: 'jpl', diameterKm: 1.1, sigmaKm: null })).toBe('1.1 km');
  });

  it('rounds estimates to two significant figures', () => {
    expect(diameterValueText({ kind: 'estimated', minKm: 2.658, maxKm: 5.943469 })).toBe(
      '2.7–5.9 km',
    );
    expect(diameterValueText({ kind: 'estimated', minKm: 0.016016, maxKm: 0.035813 })).toBe(
      '16–36 m',
    );
    expect(diameterValueText({ kind: 'estimated', minKm: 0.7, maxKm: 1.56 })).toBe('700 m–1.6 km');
  });

  it('picks the unit after rounding, at either end of the range', () => {
    expect(diameterValueText({ kind: 'estimated', minKm: 0.9996, maxKm: 2.235 })).toBe('1–2.2 km');
    expect(diameterValueText({ kind: 'estimated', minKm: 0.447, maxKm: 0.9996 })).toBe(
      '450 m–1 km',
    );
  });

  it('says unknown', () => {
    expect(diameterValueText({ kind: 'unknown' })).toBe('unknown');
  });
});

describe('diameterLabel', () => {
  it('names the source of the figure', () => {
    expect(diameterLabel({ kind: 'jpl', diameterKm: 1.1, sigmaKm: null })).toBe('Diameter (JPL)');
    expect(diameterLabel({ kind: 'estimated', minKm: 0.016, maxKm: 0.036 })).toBe('Est. diameter');
    expect(diameterLabel({ kind: 'unknown' })).toBe('Diameter');
  });
});

describe('diameterText', () => {
  it('marks estimates "est." inline for the list', () => {
    expect(diameterText({ kind: 'estimated', minKm: 0.016016, maxKm: 0.035813 })).toBe(
      'est. 16–36 m',
    );
  });

  it("leaves JPL's value and unknown as they are", () => {
    expect(diameterText({ kind: 'jpl', diameterKm: 0.37, sigmaKm: 0.02 })).toBe('370 ± 20 m');
    expect(diameterText({ kind: 'unknown' })).toBe('unknown');
  });
});
