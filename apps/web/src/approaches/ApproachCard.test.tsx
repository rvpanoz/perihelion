import type { CloseApproach } from '@perihelion/data';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { closeApproachRow } from '../test/closeApproachRow';
import { findElementProps } from '../test/elementTree';
import { ApproachCard } from './ApproachCard';

const ignore = () => undefined;

describe('ApproachCard', () => {
  const approach = closeApproachRow();

  it('shows the title, badge and four stats', () => {
    const markup = renderToStaticMarkup(
      <ApproachCard approach={approach} onFollow={ignore} onPlay={ignore} />,
    );
    expect(markup).toContain('<h2 class="focus-title">(2026 RX7)</h2>');
    expect(markup).toContain('<span class="badge">Apollo · NEO</span>');
    expect(markup.match(/<div class="stat"/g)).toHaveLength(4);
    expect(markup).toContain('title="2026-Sep-30 04:12 TDB (JPL CAD)"');
  });

  it('puts the close-up between the countdown and the stats', () => {
    const markup = renderToStaticMarkup(
      <ApproachCard approach={approach} onFollow={ignore} onPlay={ignore} closeUp={<canvas />} />,
    );
    expect(markup).toMatch(/class="countdown".*<canvas><\/canvas><dl class="stats">/);
  });

  it('follows and plays the approach it shows', () => {
    const onFollow = vi.fn<(approach: CloseApproach) => void>();
    const onPlay = vi.fn<(approach: CloseApproach) => void>();
    const [follow, play] = findElementProps<{ onClick: () => void }>(
      ApproachCard({ approach, onFollow, onPlay }),
      'button',
    );
    follow?.onClick();
    play?.onClick();
    expect(onFollow).toHaveBeenCalledWith(approach);
    expect(onPlay).toHaveBeenCalledWith(approach);
  });
});
