import type { CloseApproach } from '@perihelion/data';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DatasetState } from '../data/useDataset';
import { closeApproachRow } from '../test/closeApproachRow';
import { findElementProps } from '../test/elementTree';
import { ApproachList, ApproachRow } from './ApproachList';
import { closenessFraction } from './approachFormat';
import { approachDiameter, diameterText } from './diameter';

const NOW_JD_TDB = 2_461_314;
const ignoreSelect = () => undefined;
const ROWS = [
  closeApproachRow({ fullName: '(2026 AA1)', approachJdTdb: NOW_JD_TDB - 1 }),
  closeApproachRow({ fullName: '(2026 BB2)', approachJdTdb: NOW_JD_TDB + 1 }),
  closeApproachRow({ fullName: '(2026 CC3)', approachJdTdb: NOW_JD_TDB + 2 }),
];

function readyState(data: CloseApproach[]): DatasetState<'close-approaches'> {
  return { status: 'ready', origin: 'fresh', fetchedAt: '2026-10-01T12:00:00.000Z', data };
}

function listMarkup(state: DatasetState<'close-approaches'>, selected?: CloseApproach): string {
  return renderToStaticMarkup(
    <ApproachList
      state={state}
      selected={selected}
      nowJdTdb={NOW_JD_TDB}
      onSelect={ignoreSelect}
    />,
  );
}

function rowMarkup(approach: CloseApproach): string {
  return renderToStaticMarkup(
    <ApproachRow approach={approach} selected={false} onSelect={ignoreSelect} />,
  );
}

describe('ApproachList', () => {
  it('says so while loading and when unavailable', () => {
    expect(listMarkup({ status: 'loading' })).toContain('Loading close approaches…');
    expect(listMarkup({ status: 'unavailable' })).toContain('Close approaches unavailable');
  });

  it("states CAD's cut when no asteroid passes", () => {
    expect(listMarkup(readyState([]))).toContain(
      'No asteroid passes within 0.05 AU (19.46 LD) of Earth in this window.',
    );
  });

  it('lists Coming before Passed, each in CAD order', () => {
    const markup = listMarkup(readyState(ROWS));
    expect(markup).toContain('Passing Earth');
    expect(markup).toContain('±7 days');
    const [coming = '', passed = ''] = markup.split('aria-label="Passed"');
    expect(coming).toContain('Coming');
    expect(passed.match(/<button/g)).toHaveLength(1);
    expect(coming.match(/<button/g)).toHaveLength(2);
    expect(coming.indexOf('(2026 BB2)')).toBeLessThan(coming.indexOf('(2026 CC3)'));
  });

  it('marks only the selected row pressed', () => {
    const markup = listMarkup(readyState(ROWS), ROWS[1]);
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup).toMatch(/<button[^>]*aria-pressed="true"[^>]*>(?:(?!<\/button>).)*\(2026 BB2\)/);
  });

  it('is one Tab stop: the selected row, else the first listed', () => {
    const tabStops = (markup: string) => markup.match(/<button[^>]*tabindex="0"[^>]*>/g) ?? [];
    const selected = tabStops(listMarkup(readyState(ROWS), ROWS[0]));
    expect(selected).toHaveLength(1);
    expect(selected[0]).toContain('aria-pressed="true"');
    const unselected = listMarkup(readyState(ROWS));
    expect(tabStops(unselected)).toHaveLength(1);
    expect(unselected.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(tabStops(unselected)[0]).toContain(
      `data-row-key="${ROWS[1]?.designation} ${ROWS[1]?.approachJdTdb}"`,
    );
  });
});

describe('ApproachRow', () => {
  it('shows label, UTC time, LD, diameter and class, with CAD’s TDB string as the tooltip', () => {
    const approach = closeApproachRow();
    const markup = rowMarkup(approach);
    expect(markup).toContain('(2026 RX7)');
    expect(markup).toContain('Sep 30 · 04:11 UTC');
    expect(markup).toContain('4.80 LD');
    expect(markup).toContain(diameterText(approachDiameter(approach)));
    expect(markup).toContain('Apollo');
    expect(markup).toContain('title="2026-Sep-30 04:12 TDB"');
  });

  it('draws the closeness bar at closenessFraction', () => {
    const approach = closeApproachRow();
    expect(rowMarkup(approach)).toContain(`width:${closenessFraction(approach.distanceAu) * 100}%`);
  });

  it("shows the class swatch in the swarm's Apollo colour, and none without a class", () => {
    expect(rowMarkup(closeApproachRow())).toContain('background:#2f86e0');
    const classless = rowMarkup(closeApproachRow({ orbitClass: null }));
    expect(classless).not.toContain('swatch');
    expect(classless).toContain('—');
  });

  it('calls onSelect with the row object itself', () => {
    const approach = closeApproachRow();
    const onSelect = vi.fn();
    const [button] = findElementProps<{ onClick: () => void }>(
      ApproachRow({ approach, selected: false, onSelect }),
      'button',
    );
    button?.onClick();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0]?.[0]).toBe(approach);
  });
});
