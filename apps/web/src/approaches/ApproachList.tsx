import { type CloseApproach, DEFAULT_CLOSE_APPROACH_DAYS } from '@perihelion/data';
import type { DatasetState } from '../data/useDataset';
import { ClassSwatch } from '../shell/ClassSwatch';
import { tabStopKey } from '../shell/rovingRows';
import { useRovingRows } from '../shell/useRovingRows';
import {
  NO_APPROACHES_TEXT,
  approachDateText,
  approachLabel,
  approachUtcText,
  closenessFraction,
  distanceTexts,
  groupApproaches,
  orbitClassLabel,
} from './approachFormat';
import { approachKey } from './approachKey';
import { approachDiameter, diameterText } from './diameter';

export interface ApproachListProps {
  state: DatasetState<'close-approaches'>;
  selected: CloseApproach | undefined;
  /** Splits Passed from Coming. */
  nowJdTdb: number;
  onSelect: (approach: CloseApproach) => void;
}

export interface ApproachRowProps {
  approach: CloseApproach;
  selected: boolean;
  onSelect: (approach: CloseApproach) => void;
  /** False takes the row out of the Tab order; the list's arrow keys still reach it. */
  tabStop?: boolean;
}

interface ApproachListBodyProps extends ApproachListProps {
  focusedKey: string | undefined;
}

interface ApproachGroupProps extends Omit<ApproachListProps, 'state' | 'nowJdTdb'> {
  title: string;
  approaches: readonly CloseApproach[];
  tabStopKey: string | undefined;
}

/**
 * Coming before Passed, so the next passes are in view without scrolling. Selecting only selects (plan decision 7):
 * the focus card holds Follow and Play approach.
 */
export function ApproachList(props: ApproachListProps) {
  const roving = useRovingRows();
  return (
    <section
      className="panel approach-list"
      aria-label="Close approaches"
      {...roving.containerProps}
    >
      <h2 className="approach-list-heading">
        <span>Passing Earth</span>
        <span>{`±${DEFAULT_CLOSE_APPROACH_DAYS} days`}</span>
      </h2>
      <ApproachListBody {...props} focusedKey={roving.focusedKey} />
    </section>
  );
}

function ApproachListBody({ state, nowJdTdb, focusedKey, ...rowProps }: ApproachListBodyProps) {
  if (state.status === 'loading') return <p className="approach-note">Loading close approaches…</p>;
  if (state.status === 'unavailable') {
    return <p className="approach-note">Close approaches unavailable</p>;
  }
  if (state.data.length === 0) return <p className="approach-note">{NO_APPROACHES_TEXT}</p>;
  const { passed, coming } = groupApproaches({ approaches: state.data, nowJdTdb });
  const ordered = [...coming, ...passed];
  const stopKey = approachTabStop({ ordered, focusedKey, selected: rowProps.selected });
  const groupProps = { ...rowProps, tabStopKey: stopKey };
  return (
    <>
      <ApproachGroup title="Coming" approaches={coming} {...groupProps} />
      <ApproachGroup title="Passed" approaches={passed} {...groupProps} />
    </>
  );
}

function ApproachGroup({ title, approaches, selected, onSelect, tabStopKey }: ApproachGroupProps) {
  if (approaches.length === 0) return null;
  return (
    <div className="approach-group" role="group" aria-label={title}>
      <h3 className="approach-group-heading">{title}</h3>
      <ul>
        {approaches.map((approach) => (
          <ApproachRow
            key={approachKey(approach)}
            approach={approach}
            selected={approach === selected}
            onSelect={onSelect}
            tabStop={approachKey(approach) === tabStopKey}
          />
        ))}
      </ul>
    </div>
  );
}

function approachTabStop(rows: {
  ordered: readonly CloseApproach[];
  focusedKey: string | undefined;
  selected: CloseApproach | undefined;
}): string | undefined {
  const { ordered, focusedKey, selected } = rows;
  return tabStopKey({
    keys: ordered.map(approachKey),
    focusedKey,
    selectedKey: selected && approachKey(selected),
  });
}

/** CAD's TDB string is the tooltip: the row shows UTC, and the source time stays one hover away. */
export function ApproachRow({ approach, selected, onSelect, tabStop = true }: ApproachRowProps) {
  return (
    <li>
      <button
        type="button"
        className="approach-row"
        tabIndex={tabStop ? 0 : -1}
        data-row-key={approachKey(approach)}
        aria-pressed={selected}
        title={approachDateText(approach)}
        onClick={() => onSelect(approach)}
      >
        <span className="approach-name">{approachLabel(approach)}</span>
        <span className="approach-when mono">{approachUtcText(approach)}</span>
        <span className="approach-bar">
          <i style={{ width: `${closenessFraction(approach.distanceAu) * 100}%` }} />
        </span>
        <ApproachRowMeta approach={approach} />
      </button>
    </li>
  );
}

function ApproachRowMeta({ approach }: { approach: CloseApproach }) {
  return (
    <span className="approach-meta">
      <span>
        <span className="approach-ld mono">{distanceTexts(approach.distanceAu).lunar}</span>
        {` · ${diameterText(approachDiameter(approach))}`}
      </span>
      <span className="approach-class">
        <ClassSwatch orbitClass={approach.orbitClass} />
        {orbitClassLabel(approach.orbitClass)}
      </span>
    </span>
  );
}
