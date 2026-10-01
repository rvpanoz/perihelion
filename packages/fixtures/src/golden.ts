// Golden tests in packages/orbit import "@perihelion/fixtures/golden" rather than the package root:
// orbit's tsconfig has no Node/DOM globals (CLAUDE.md non-negotiable #4), but the root entry re-exports
// the generator, which uses URLSearchParams and would fail orbit's typecheck. This entry point re-exports
// only the network-free, environment-free pieces a golden test needs: loaders, fixture spec constants,
// and the fixture record types.
export * from './loaders';
export * from './fixtureSpec';
export type {
  StateRecord,
  ElementsRecord,
  PlanetFixtures,
  AsteroidFixtures,
  PlanetFixture,
  AsteroidFixture,
  SunOrientationFixtures,
  SunSample,
} from './fixtureSchema';
