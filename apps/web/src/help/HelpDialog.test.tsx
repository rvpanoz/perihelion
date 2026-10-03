import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HELP_TABS } from './helpContent';
import HelpDialog, { HelpTabs } from './HelpDialog';

const ignore = () => undefined;

function tabsMarkup(selectedId = HELP_TABS[0]?.id ?? 'seeing'): string {
  return renderToStaticMarkup(<HelpTabs selectedId={selectedId} onSelect={ignore} />);
}

/** Entities as React escapes them, so expected text matches the markup. */
function escaped(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
    .replaceAll('<', '&lt;');
}

describe('HelpDialog', () => {
  it('is a native dialog named by its heading, with a named close button', () => {
    const markup = renderToStaticMarkup(<HelpDialog open={false} onClose={ignore} />);
    const labelledBy = /<dialog[^>]*aria-labelledby="([^"]+)"/.exec(markup)?.[1];
    expect(markup).toMatch(new RegExp(`<h2[^>]*id="${labelledBy}"[^>]*>Perihelion guide</h2>`));
    expect(markup).toMatch(/<button[^>]*aria-label="Close help"/);
  });
});

describe('HelpTabs', () => {
  it('has one tab per help tab in a tab list, in order', () => {
    const markup = tabsMarkup();
    expect(markup).toContain('role="tablist"');
    const titles = [...markup.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((match) => match[1]);
    expect(titles).toEqual(HELP_TABS.map((tab) => escaped(tab.title)));
  });

  it('marks only the selected tab, and gives only it the Tab stop', () => {
    const markup = tabsMarkup('glossary');
    const tabs = markup.match(/<button[^>]*role="tab"[^>]*>/g) ?? [];
    expect(tabs.filter((tab) => tab.includes('aria-selected="true"'))).toHaveLength(1);
    expect(tabs.find((tab) => tab.includes('aria-selected="true"'))).toContain('tabindex="0"');
    expect(tabs.filter((tab) => tab.includes('tabindex="-1"'))).toHaveLength(HELP_TABS.length - 1);
  });

  it("shows only the selected tab's panel", () => {
    const panels = tabsMarkup('real').match(/<div role="tabpanel"[^>]*>/g) ?? [];
    expect(panels).toHaveLength(HELP_TABS.length);
    expect(panels.filter((panel) => !panel.includes('hidden'))).toHaveLength(1);
  });

  it('labels the panel with its tab, and the tab controls the panel', () => {
    const markup = tabsMarkup('credits');
    const selected = /<button[^>]*aria-selected="true"[^>]*>/.exec(markup)?.[0] ?? '';
    const tabId = /id="([^"]+)"/.exec(selected)?.[1];
    const panelId = /aria-controls="([^"]+)"/.exec(selected)?.[1];
    expect(markup).toMatch(
      new RegExp(`role="tabpanel"[^>]*id="${panelId}"[^>]*aria-labelledby="${tabId}"`),
    );
  });

  it("renders every tab's content when it is selected", () => {
    for (const tab of HELP_TABS) {
      const markup = tabsMarkup(tab.id);
      for (const paragraph of tab.intro) expect(markup).toContain(escaped(paragraph));
      for (const entry of tab.entries) expect(markup).toContain(escaped(entry.term));
    }
  });

  it('shows the shots with their stills, lazily loaded, with text alternatives', () => {
    const images = tabsMarkup('shots').match(/<img [^>]*>/g) ?? [];
    expect(images).toHaveLength(3);
    for (const image of images) {
      expect(image).toMatch(/alt="[^"]+"/);
      expect(image).toContain('loading="lazy"');
    }
  });

  it('links each credit to its source, opening in a new tab', () => {
    const links = tabsMarkup('credits').match(/<a [^>]*>/g) ?? [];
    const credits = HELP_TABS.find((tab) => tab.id === 'credits');
    expect(links).toHaveLength(credits?.entries.length ?? -1);
    for (const link of links) expect(link).toMatch(/target="_blank" rel="noreferrer"/);
  });
});
