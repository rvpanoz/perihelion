import { dot, norm, writeGeocentricOffset } from '@perihelion/orbit';
import { describe, expect, it } from 'vitest';
import { closeApproachRow } from '../../test/closeApproachRow';
import { crossingDays } from './approachTiming';
import { elementsForApproach } from './asteroidPosition';
import { passNormalForApproach, writePassNormal } from './passNormal';

const row = closeApproachRow();
const span = {
  elements: elementsForApproach(row),
  approachJdTdb: row.approachJdTdb,
  halfSpanDays: crossingDays(row),
};

describe('writePassNormal', () => {
  it('is a unit vector, signed toward ecliptic north', () => {
    const normal = writePassNormal(span, [0, 0, 0]);
    expect(norm(normal)).toBeCloseTo(1, 12);
    expect(normal[2]).toBeGreaterThanOrEqual(0);
  });

  it('is perpendicular to the pass before, at and after closest approach', () => {
    const normal = writePassNormal(span, [0, 0, 0]);
    for (const offsetDays of [-span.halfSpanDays, 0, span.halfSpanDays]) {
      const jdTdb = row.approachJdTdb + offsetDays;
      const offset = writeGeocentricOffset({ elements: span.elements, jdTdb }, [0, 0, 0]);
      expect(Math.abs(dot(normal, offset)) / norm(offset)).toBeLessThan(1e-3);
    }
  });
});

describe('passNormalForApproach', () => {
  it('works the normal out once per row', () => {
    expect(passNormalForApproach(row)).toBe(passNormalForApproach(row));
  });
});
