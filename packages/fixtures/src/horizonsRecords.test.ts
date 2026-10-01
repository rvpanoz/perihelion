import { describe, expect, it } from 'vitest';
import elementsResponse from './recorded/elements-eros.json' with { type: 'json' };
import observerResponse from './recorded/observer-sun.json' with { type: 'json' };
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { toElementsRecord, toStateRecord, toSunObserverRecord } from './horizonsRecords';
import { HorizonsError } from './horizonsResponse';
import { parseHorizonsTable } from './horizonsTable';

const VECTOR_ROW = { JDTDB: '2451545.0', X: '1', Y: '2', Z: '3', VX: '4', VY: '5', VZ: '6' };

describe('toStateRecord', () => {
  it('parses exponent notation to the exact float64 Horizons printed', () => {
    const [first] = parseHorizonsTable(vectorsResponse.result);
    const state = toStateRecord(first ?? {});
    expect(state.jdTdb).toBe(2378496.5);
    expect(state.positionAu).toEqual([
      -0.2249851741486615, 0.957120808080457, 0.0004245450310084849,
    ]);
    expect(state.velocityAuPerDay[0]).toBe(-0.01703050204836069);
  });

  it('rejects empty, missing and non-numeric fields instead of reading them as zero', () => {
    expect(() => toStateRecord({ ...VECTOR_ROW, X: '' })).toThrow(HorizonsError);
    expect(() => toStateRecord({ ...VECTOR_ROW, Y: 'n.a.' })).toThrow('Column Y is not a number');
    const withoutVz = Object.fromEntries(
      Object.entries(VECTOR_ROW).filter(([column]) => column !== 'VZ'),
    );
    expect(() => toStateRecord(withoutVz)).toThrow('Column VZ');
  });
});

describe('toElementsRecord', () => {
  it("reads Eros's osculating elements at the requested epoch", () => {
    const [row] = parseHorizonsTable(elementsResponse.result);
    const elements = toElementsRecord(row ?? {});
    expect(elements.epochJdTdb).toBe(2461000.5);
    // Sanity ranges for 433 Eros (e ≈ 0.223, a ≈ 1.458 AU, i ≈ 10.8°), not tolerances.
    expect(elements.eccentricity).toBeGreaterThan(0.22);
    expect(elements.eccentricity).toBeLessThan(0.23);
    expect(elements.semiMajorAxisAu).toBeGreaterThan(1.45);
    expect(elements.semiMajorAxisAu).toBeLessThan(1.47);
    expect(elements.inclinationDeg).toBeGreaterThan(10);
    expect(elements.inclinationDeg).toBeLessThan(11.5);
  });
});

describe('toSunObserverRecord', () => {
  it("reads the JD (TT) and Earth's heliographic latitude from a recorded Horizons observer table", () => {
    const records = parseHorizonsTable(observerResponse.result).map(toSunObserverRecord);
    expect(records).toEqual([
      { jdTt: 2461041.5, earthHeliographicLatitudeDeg: -2.997476 },
      { jdTt: 2461222.5, earthHeliographicLatitudeDeg: 2.838567 },
    ]);
  });

  it('rejects a latitude Horizons could not compute', () => {
    const row = { Date_________JDTT: '2461041.5', 'ObsSub-LAT': 'n.a.' };
    expect(() => toSunObserverRecord(row)).toThrow('Column ObsSub-LAT is not a number');
  });
});
