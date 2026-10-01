import { describe, expect, it } from 'vitest';
import { indexCatalogOrbits } from './approachOrbits';
import type { NeoCatalog } from './neoCatalog';

const TWO_ROWS: NeoCatalog = {
  count: 2,
  designation: ['433', '2026 SY'],
  name: ['Eros', null],
  epochJdTdb: [2461000.5, 2461200.5],
  eccentricity: [0.22283594, 0.63756517],
  semiMajorAxisAu: [1.458121, 2.77035359],
  inclinationDeg: [10.828467, 4.1],
  longitudeOfAscendingNodeDeg: [304.270103, 12.5],
  argumentOfPerihelionDeg: [178.929754, 250.25],
  meanAnomalyDeg: [310.554328, 1.75],
  absoluteMagnitude: [10.38, 27.1],
  orbitClass: ['AMO', 'APO'],
};

describe('indexCatalogOrbits', () => {
  it('maps each designation to its row of elements and its class', () => {
    const index = indexCatalogOrbits(TWO_ROWS);
    expect(index.size).toBe(2);
    expect(index.get('2026 SY')).toEqual({
      orbit: {
        epochJdTdb: 2461200.5,
        eccentricity: 0.63756517,
        semiMajorAxisAu: 2.77035359,
        inclinationDeg: 4.1,
        longitudeOfAscendingNodeDeg: 12.5,
        argumentOfPerihelionDeg: 250.25,
        meanAnomalyDeg: 1.75,
      },
      orbitClass: 'APO',
    });
    expect(index.get('433')?.orbitClass).toBe('AMO');
  });
});
