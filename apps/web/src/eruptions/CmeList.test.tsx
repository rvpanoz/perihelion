import type { Cme } from '@perihelion/data';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DatasetState } from '../data/useDataset';
import { cmeRow } from '../test/cmeRow';
import { findElementProps } from '../test/elementTree';
import { CmeList, CmeRow } from './CmeList';

const ignoreSelect = () => undefined;
const OLDER = cmeRow({ activityId: 'older', startTime: '2026-09-02T00:08:00.000Z' });
const NEWER = cmeRow({ activityId: 'newer', startTime: '2026-09-28T14:36:00.000Z' });

function readyState(data: Cme[]): DatasetState<'cmes'> {
  return { status: 'ready', origin: 'fresh', fetchedAt: '2026-10-01T12:00:00.000Z', data };
}

function listMarkup(state: DatasetState<'cmes'>, selected?: Cme): string {
  return renderToStaticMarkup(
    <CmeList state={state} selected={selected} onSelect={ignoreSelect} />,
  );
}

describe('CmeList', () => {
  it('says when the CMEs are loading, unavailable or empty', () => {
    expect(listMarkup({ status: 'loading' })).toContain('Loading CMEs…');
    expect(listMarkup({ status: 'unavailable' })).toContain('CMEs unavailable');
    expect(listMarkup(readyState([]))).toContain('No CME with a complete DONKI analysis');
  });

  it('lists the newest first and marks the selected row', () => {
    const markup = listMarkup(readyState([OLDER, NEWER]), OLDER);
    expect(markup.indexOf('Sep 28')).toBeLessThan(markup.indexOf('Sep 2 '));
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup).toMatch(/aria-pressed="true" title="older"/);
  });
});

describe('CmeRow', () => {
  it('shows speed, cone and the Earth tag, and selects its CME', () => {
    const onSelect = vi.fn<(cme: Cme) => void>();
    const markup = renderToStaticMarkup(
      <CmeRow cme={NEWER} selected={false} onSelect={ignoreSelect} />,
    );
    expect(markup).toContain('873 km/s');
    expect(markup).toContain('38° cone');
    expect(markup).toContain('cme-tag-arrival');
    const [button] = findElementProps<{ onClick: () => void }>(
      CmeRow({ cme: NEWER, selected: false, onSelect }),
      'button',
    );
    button?.onClick();
    expect(onSelect).toHaveBeenCalledWith(NEWER);
  });
});
