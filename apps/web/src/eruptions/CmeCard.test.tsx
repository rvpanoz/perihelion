import type { Cme } from '@perihelion/data';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { cmeRow } from '../test/cmeRow';
import { findElementProps } from '../test/elementTree';
import { CmeCard } from './CmeCard';

const ignore = () => undefined;

describe('CmeCard', () => {
  it('shows the title, badge, three stats, the arrival line and the DONKI link', () => {
    const markup = renderToStaticMarkup(<CmeCard cme={cmeRow()} onWatch={ignore} />);
    expect(markup).toContain('<h2 class="focus-title">Coronal mass ejection</h2>');
    expect(markup).toContain('Earth arrival predicted</span>');
    expect(markup.match(/<div class="stat"/g)).toHaveLength(3);
    expect(markup).toContain(
      '<p class="cme-arrival">ENLIL predicts Earth arrival Sep 7 · 21:31 UTC</p>',
    );
    expect(markup).toContain('href="https://ccmc.gsfc.nasa.gov/DONKI/view/CME/48500/-1"');
  });

  it('leaves the link out when DONKI gives none', () => {
    const markup = renderToStaticMarkup(<CmeCard cme={cmeRow({ link: null })} onWatch={ignore} />);
    expect(markup).not.toContain('<a ');
  });

  it('watches the eruption it shows', () => {
    const cme = cmeRow();
    const onWatch = vi.fn<(cme: Cme) => void>();
    const [watch] = findElementProps<{ onClick: () => void }>(CmeCard({ cme, onWatch }), 'button');
    watch?.onClick();
    expect(onWatch).toHaveBeenCalledWith(cme);
  });
});
