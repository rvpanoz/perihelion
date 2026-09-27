import asteroidsJson from '../data/asteroids.json' with { type: 'json' };
import planetsJson from '../data/planets.json' with { type: 'json' };
import {
  type AsteroidFixtures,
  type PlanetFixtures,
  asteroidFixturesSchema,
  planetFixturesSchema,
} from './fixtureSchema';

/** Validated on load so a hand-edited or truncated fixture fails here, not deep in a golden test. */
export function loadPlanetFixtures(): PlanetFixtures {
  return planetFixturesSchema.parse(planetsJson);
}

export function loadAsteroidFixtures(): AsteroidFixtures {
  return asteroidFixturesSchema.parse(asteroidsJson);
}
