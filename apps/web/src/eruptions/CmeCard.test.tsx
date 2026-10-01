import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { cmeRow } from '../test/cmeRow';
import { CmeCard } from './CmeCard';

describe('CmeCard', () => {
  it('shows the title, badge, three stats, the arrival line and the DONKI link', () => {
    const markup = renderToStaticMarkup(<CmeCard cme={cmeRow()} />);
    expect(markup).toContain('<h2 class="focus-title">Coronal mass ejection</h2>');
    expect(markup).toContain('Earth arrival predicted</span>');
    expect(markup.match(/<div class="stat"/g)).toHaveLength(3);
    expect(markup).toContain(
      '<p class="cme-arrival">ENLIL predicts Earth arrival Sep 7 · 21:31 UTC</p>',
    );
    expect(markup).toContain('href="https://ccmc.gsfc.nasa.gov/DONKI/view/CME/48500/-1"');
  });

  it('leaves the link out when DONKI gives none, and places actions above the source', () => {
    const markup = renderToStaticMarkup(
      <CmeCard cme={cmeRow({ link: null })} actions={<button type="button">Watch</button>} />,
    );
    expect(markup).not.toContain('<a ');
    expect(markup).toMatch(/cme-arrival.*<button type="button">Watch<\/button><p class="src">/);
  });
});
