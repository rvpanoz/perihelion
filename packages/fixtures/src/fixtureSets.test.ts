import { describe, expect, it } from 'vitest';
import { FIXTURE_SETS, selectFixtureSets } from './fixtureSets';

describe('selectFixtureSets', () => {
  it('selects every set when no names are given', () => {
    expect(selectFixtureSets([])).toEqual(FIXTURE_SETS);
  });

  it('selects only the named sets, so regenerating one never rewrites the others', () => {
    expect(selectFixtureSets(['sun'])).toEqual(['sun']);
  });

  it('rejects an unknown name, which is a typo rather than a request for nothing', () => {
    expect(() => selectFixtureSets(['suns'])).toThrow('Unknown fixture set "suns"');
  });
});
