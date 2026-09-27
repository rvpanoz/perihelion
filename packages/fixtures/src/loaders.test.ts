import { describe, expect, it } from 'vitest';
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
} from './fixtureSpec';
import { toStateRecord } from './horizonsRecords';
import { HORIZONS_FRAME_PARAMS } from './horizonsQuery';
import { parseHorizonsTable } from './horizonsTable';
import { loadAsteroidFixtures, loadPlanetFixtures } from './loaders';

describe('committed Horizons fixtures', () => {
  it('have a state for every planet at every sample date', () => {
    const { planets } = loadPlanetFixtures();
    for (const name of PLANET_NAMES) {
      expect(planets[name].states.map((state) => state.jdTdb)).toEqual(PLANET_SAMPLE_JD_TDB);
    }
  });

  it('have elements at the epoch and states at every offset for every asteroid', () => {
    const { asteroids, epochJdTdb } = loadAsteroidFixtures();
    expect(epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
    for (const name of ASTEROID_NAMES) {
      expect(asteroids[name].elements.epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
      expect(asteroids[name].states.map((state) => state.jdTdb)).toEqual(ASTEROID_SAMPLE_JD_TDB);
    }
  });

  it('record the frame settings they were generated with', () => {
    expect(loadPlanetFixtures().source.settings).toEqual(HORIZONS_FRAME_PARAMS);
    expect(loadAsteroidFixtures().source.settings).toEqual(HORIZONS_FRAME_PARAMS);
  });

  it('agree with the independently recorded Earth–Moon barycentre response at J2000', () => {
    const recordedJ2000 = toStateRecord(parseHorizonsTable(vectorsResponse.result)[1] ?? {});
    const generated = loadPlanetFixtures().planets.earthMoonBarycenter.states;
    expect(generated.find((state) => state.jdTdb === 2451545)).toEqual(recordedJ2000);
  });
});
