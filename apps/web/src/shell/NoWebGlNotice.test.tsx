import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NoWebGlNotice } from './NoWebGlNotice';

describe('NoWebGlNotice', () => {
  const markup = renderToStaticMarkup(<NoWebGlNotice />);

  it('says why the app cannot run, without a canvas', () => {
    expect(markup).toContain('<h1>Perihelion needs WebGL 2</h1>');
    expect(markup).not.toContain('<canvas');
  });

  it('shows the three release stills, each with a text alternative and a fixed size', () => {
    const images = markup.match(/<img [^>]*>/g) ?? [];
    expect(images).toHaveLength(3);
    for (const image of images) {
      expect(image).toMatch(/src="\/stills\/[a-z-]+\.webp"/);
      expect(image).toMatch(/alt="[^"]+"/);
      expect(image).toMatch(/width="\d+" height="\d+"/);
    }
  });

  it('links to the data sources', () => {
    expect(markup).toContain('href="https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html"');
    expect(markup).toContain('href="https://ssd-api.jpl.nasa.gov/doc/cad.html"');
    expect(markup).toContain('href="https://kauai.ccmc.gsfc.nasa.gov/DONKI/"');
  });
});
