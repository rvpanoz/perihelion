import { type NamedDatasetState, snapshotBannerText } from './dataStatus';

/**
 * One line under the top bar while any dataset shows the snapshot; it goes when live data replaces it. Not a live
 * region: the data-status pill already announces the change.
 */
export function SnapshotBanner({ datasets }: { datasets: readonly NamedDatasetState[] }) {
  const text = snapshotBannerText(datasets);
  if (text === undefined) return null;
  return <p className="panel snapshot-banner">{text}</p>;
}
