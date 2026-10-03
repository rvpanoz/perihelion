import { describe, expect, it } from 'vitest';
import { RELEASE_STILLS } from '../shell/releaseStills';
import { HELP_TABS, type HelpTab } from './helpContent';

function tab(id: HelpTab['id']): HelpTab {
  const found = HELP_TABS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No help tab ${id}`);
  return found;
}

function textOf(helpTab: HelpTab): string {
  return [...helpTab.intro, ...helpTab.entries.flatMap((entry) => [entry.term, entry.text])].join(
    '\n',
  );
}

describe('HELP_TABS', () => {
  it("has the five tabs in the plan's order", () => {
    expect(HELP_TABS.map((helpTab) => helpTab.title)).toEqual([
      "What you're seeing",
      'The three shots',
      'Real vs illustrative',
      'Glossary',
      'Credits',
    ]);
  });

  it('gives every tab some content', () => {
    for (const helpTab of HELP_TABS) {
      expect(helpTab.intro.length + helpTab.entries.length).toBeGreaterThan(0);
    }
  });

  it('names the three shots, each with its release still', () => {
    const shots = tab('shots').entries;
    expect(shots.map((entry) => entry.term)).toEqual([
      'The Swarm',
      'The Close Approach',
      'The Eruption',
    ]);
    expect(shots.map((entry) => entry.still)).toEqual([...RELEASE_STILLS]);
  });

  it('defines the four orbit classes with CNEOS bounds', () => {
    const glossary = textOf(tab('glossary'));
    expect(glossary).toContain('Q < 0.983 au');
    expect(glossary).toContain('q < 1.017 au');
    expect(glossary).toContain('1.017 < q < 1.3 au');
  });

  it("gives the lunar distance and the au from the app's own constants", () => {
    const glossary = textOf(tab('glossary'));
    expect(glossary).toContain('384,400 km');
    expect(glossary).toContain('149,597,870.7 km');
  });

  it('credits every data source the app uses, its libraries and its licence', () => {
    const credits = textOf(tab('credits'));
    for (const source of [
      'SBDB Query API',
      'Small-Body Database API',
      'Close Approach Data API',
      'Horizons',
      'DONKI',
      'WSA-ENLIL',
      'Blue Marble Next Generation',
      'three.js',
      'React Three Fiber',
      'GPL-3.0-or-later',
    ]) {
      expect(credits).toContain(source);
    }
  });

  it('links the credits to their sources over https, the licence to the code', () => {
    const links = tab('credits').entries.map((entry) => entry.link);
    expect(links.every((link) => link?.startsWith('https://'))).toBe(true);
    expect(links).toContain('https://github.com/rvpanoz/perihelion');
  });
});
