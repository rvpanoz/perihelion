import { type Cme, DEFAULT_CME_DAYS } from '@perihelion/data';
import type { DatasetState } from '../data/useDataset';
import { EARTH_TAG_TEXT } from './cmeCardModel';
import { cmeUtcText } from './cmeFormat';
import { earthTag } from './cmeGeometry';

export interface CmeListProps {
  state: DatasetState<'cmes'>;
  selected: Cme | undefined;
  onSelect: (cme: Cme) => void;
}

export interface CmeRowProps {
  cme: Cme;
  selected: boolean;
  onSelect: (cme: Cme) => void;
}

/** Newest first: the latest eruptions are the news. Selecting only selects; the card holds Watch eruption. */
export function CmeList(props: CmeListProps) {
  return (
    <section className="panel approach-list cme-list" aria-label="Eruptions">
      <h2 className="approach-list-heading">
        <span>Eruptions</span>
        <span>{`last ${DEFAULT_CME_DAYS} days`}</span>
      </h2>
      <CmeListBody {...props} />
    </section>
  );
}

function CmeListBody({ state, selected, onSelect }: CmeListProps) {
  if (state.status === 'loading') return <p className="approach-note">Loading CMEs…</p>;
  if (state.status === 'unavailable') return <p className="approach-note">CMEs unavailable</p>;
  if (state.data.length === 0) {
    return <p className="approach-note">No CME with a complete DONKI analysis in this window.</p>;
  }
  return (
    <ul className="cme-rows">
      {state.data.toReversed().map((cme) => (
        <CmeRow key={cme.activityId} cme={cme} selected={cme === selected} onSelect={onSelect} />
      ))}
    </ul>
  );
}

export function CmeRow({ cme, selected, onSelect }: CmeRowProps) {
  const tag = earthTag(cme);
  return (
    <li>
      <button
        type="button"
        className="approach-row cme-row"
        aria-pressed={selected}
        title={cme.activityId}
        onClick={() => onSelect(cme)}
      >
        <span className="approach-name mono">{cmeUtcText(cme.startTime)}</span>
        <span className="approach-when mono">{`${cme.analysis.speedKmPerS} km/s`}</span>
        <span className="approach-meta">
          <span>{`${cme.analysis.halfAngleDeg}° cone`}</span>
          <span className={`cme-tag cme-tag-${tag}`}>{EARTH_TAG_TEXT[tag]}</span>
        </span>
      </button>
    </li>
  );
}
