import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SnapshotBanner } from './SnapshotBanner';
import type { DatasetStatusState } from './dataStatus';

function bannerFor(state: DatasetStatusState): string {
  return renderToStaticMarkup(<SnapshotBanner datasets={[{ label: 'CMEs', state }]} />);
}

describe('SnapshotBanner', () => {
  it('shows while a dataset is the snapshot', () => {
    const markup = bannerFor({
      status: 'ready',
      origin: 'snapshot',
      fetchedAt: '2026-09-28T10:00:00.000Z',
    });
    expect(markup).toContain('showing the snapshot from 28 Sep 2026');
  });

  it.each(['fresh', 'stale'] as const)('is not rendered for %s data', (origin) => {
    expect(bannerFor({ status: 'ready', origin, fetchedAt: '2026-10-03T00:00:00.000Z' })).toBe('');
  });
});
