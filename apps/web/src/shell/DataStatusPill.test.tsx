import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataStatusPill } from './DataStatusPill';

const NOW_MS = Date.parse('2026-10-01T12:00:00.000Z');

describe('DataStatusPill', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the tone, a bold head word and one line per dataset', () => {
    vi.useFakeTimers({ now: NOW_MS });
    const fetchedAt = new Date(NOW_MS - 12 * 60_000).toISOString();
    const markup = renderToStaticMarkup(
      <DataStatusPill
        datasets={[
          {
            label: 'NEO catalog',
            state: { status: 'ready', data: [], origin: 'fresh', fetchedAt },
            summary: '40,123 asteroids',
          },
        ]}
      />,
    );
    expect(markup).toContain('data-tone="live"');
    expect(markup).toContain('<b>Live</b> · JPL · updated 12 min ago');
    expect(markup).toContain('<li>NEO catalog: 40,123 asteroids · fetched 12 min ago</li>');
  });
});
