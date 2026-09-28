import { describe, expect, it } from 'vitest';
import elementsResponse from './recorded/elements-eros.json' with { type: 'json' };
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { readElementsProvenance, readHeaderProvenance } from './horizonsProvenance';
import { HorizonsError } from './horizonsResponse';

describe('readHeaderProvenance', () => {
  it('reads the orbit solution and ephemeris of a small-body response', () => {
    expect(readHeaderProvenance(elementsResponse.result)).toEqual({
      generatedAt: 'Sun Sep 27 15:54:03 2026 Pasadena, USA',
      ephemeris: 'DE441',
      targetSource: 'JPL#659',
    });
  });

  it('reads the ephemeris as the source of a planet response', () => {
    expect(readHeaderProvenance(vectorsResponse.result)).toEqual({
      generatedAt: 'Sun Sep 27 15:54:02 2026 Pasadena, USA',
      ephemeris: 'DE441',
      targetSource: 'DE441',
    });
  });

  it('throws when the header is missing', () => {
    expect(() => readHeaderProvenance('\nNo matches found.\n')).toThrow(HorizonsError);
  });
});

describe('readElementsProvenance', () => {
  it('reads the perturber set and the Keplerian GM behind the elements', () => {
    expect(readElementsProvenance(elementsResponse.result)).toEqual({
      perturbers: 'SB441-N16',
      keplerianGmAu3PerDay2: 2.9591220828411951e-4,
    });
  });

  it('reads no perturber set for a spacecraft-derived trajectory such as Bennu', () => {
    const bennuHeader = [
      'Target body name: 101955 Bennu (1999 RQ36) (2101955) {source: ORX_merged_DE424}',
      'Center body name: Sun (10)                        {source: ORX_merged_DE424}',
      'Keplerian GM    : 2.9591220828411951E-04 au^3/d^2',
    ].join('\n');
    expect(readElementsProvenance(bennuHeader)).toEqual({
      perturbers: null,
      keplerianGmAu3PerDay2: 2.9591220828411951e-4,
    });
  });

  it('throws on a planet vectors response, which has no Keplerian GM', () => {
    expect(() => readElementsProvenance(vectorsResponse.result)).toThrow(HorizonsError);
  });
});
