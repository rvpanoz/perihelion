/** Fixture sets `npm run fixtures` can write; each is one file in packages/fixtures/data. */
export const FIXTURE_SETS = ['planets', 'asteroids', 'sun'] as const;
export type FixtureSet = (typeof FIXTURE_SETS)[number];

/** No names selects every set; an unknown name is a typo, not a request for nothing. */
export function selectFixtureSets(names: readonly string[]): readonly FixtureSet[] {
  if (names.length === 0) return FIXTURE_SETS;
  return names.map((name) => {
    const set = FIXTURE_SETS.find((known) => known === name);
    if (set === undefined)
      throw new Error(`Unknown fixture set "${name}": ${FIXTURE_SETS.join(', ')}`);
    return set;
  });
}
