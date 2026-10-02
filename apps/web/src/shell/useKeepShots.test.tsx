import type { CloseApproach, Cme } from '@perihelion/data';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { approachSelection } from '../approaches/approachSelection';
import type { DatasetState } from '../data/useDataset';
import { cmeSelection } from '../eruptions/cmeSelection';
import { closeApproachRow } from '../test/closeApproachRow';
import { cmeRow } from '../test/cmeRow';
import { type ShotDatasets, useKeepShots } from './useKeepShots';

const LOADING = { status: 'loading' } as const;

const FETCHED_AT = '2026-10-03T00:00:00.000Z';
type Origin = 'snapshot' | 'fresh';

function readyApproaches(data: CloseApproach[], origin: Origin): DatasetState<'close-approaches'> {
  return { status: 'ready', origin, fetchedAt: FETCHED_AT, data };
}

function readyCmes(data: Cme[], origin: Origin): DatasetState<'cmes'> {
  return { status: 'ready', origin, fetchedAt: FETCHED_AT, data };
}

function Probe(datasets: ShotDatasets) {
  useKeepShots(datasets);
  return <group />;
}

describe('useKeepShots', () => {
  afterEach(() => {
    approachSelection.clear();
    cmeSelection.clear();
  });

  it('keeps the open approach selected, as the live row, when live data replaces the snapshot', async () => {
    const snapshotRow = closeApproachRow();
    approachSelection.select(snapshotRow);
    const renderer = await ReactThreeTestRenderer.create(
      <Probe closeApproaches={readyApproaches([snapshotRow], 'snapshot')} cmes={LOADING} />,
    );
    const liveRow = closeApproachRow({ distanceAu: 0.0123 });
    await renderer.update(
      <Probe closeApproaches={readyApproaches([liveRow], 'fresh')} cmes={LOADING} />,
    );
    expect(approachSelection.selected).toBe(liveRow);
    await renderer.unmount();
  });

  it('clears a selected CME the live list no longer has', async () => {
    cmeSelection.select(cmeRow());
    const renderer = await ReactThreeTestRenderer.create(
      <Probe closeApproaches={LOADING} cmes={readyCmes([cmeRow()], 'snapshot')} />,
    );
    const otherCme = cmeRow({ activityId: '2026-10-01T00:00:00-CME-001' });
    await renderer.update(
      <Probe closeApproaches={LOADING} cmes={readyCmes([otherCme], 'fresh')} />,
    );
    expect(cmeSelection.selected).toBeUndefined();
    await renderer.unmount();
  });
});
