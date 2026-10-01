import {
  type CloseApproach,
  DEFAULT_CLOSE_APPROACH_DAYS,
  NEO_ORBIT_CLASSES,
  type NeoOrbitClass,
} from '@perihelion/data';
import type { DatasetState } from '../data/useDataset';
import { SWARM_CLASS_COLORS } from '../scene/swarm/swarmLook';
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
}

interface ApproachGroupProps extends Omit<ApproachListProps, 'state' | 'nowJdTdb'> {
  title: string;
  approaches: readonly CloseApproach[];
}

/**
 * Coming before Passed, so the next passes are in view without scrolling. Selecting only selects (plan decision 7):
 * the focus card holds Follow and Play approach.
 */
export function ApproachList(props: ApproachListProps) {
  return (
    <section className="panel approach-list" aria-label="Close approaches">
      <h2 className="approach-list-heading">
        <span>Passing Earth</span>
        <span>{`±${DEFAULT_CLOSE_APPROACH_DAYS} days`}</span>
      </h2>
      <ApproachListBody {...props} />
    </section>
  );
}

function ApproachListBody({ state, nowJdTdb, ...groupProps }: ApproachListProps) {
  if (state.status === 'loading') return <p className="approach-note">Loading close approaches…</p>;
  if (state.status === 'unavailable') {
    return <p className="approach-note">Close approaches unavailable</p>;
  }
  if (state.data.length === 0) return <p className="approach-note">{NO_APPROACHES_TEXT}</p>;
  const { passed, coming } = groupApproaches({ approaches: state.data, nowJdTdb });
  return (
    <>
      <ApproachGroup title="Coming" approaches={coming} {...groupProps} />
      <ApproachGroup title="Passed" approaches={passed} {...groupProps} />
    </>
  );
}

function ApproachGroup({ title, approaches, selected, onSelect }: ApproachGroupProps) {
  if (approaches.length === 0) return null;
  return (
    <div className="approach-group" role="group" aria-label={title}>
      <h3 className="approach-group-heading">{title}</h3>
      <ul>
        {approaches.map((approach) => (
          <ApproachRow
            key={`${approach.designation} ${approach.approachJdTdb}`}
            approach={approach}
            selected={approach === selected}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

/** CAD's TDB string is the tooltip: the row shows UTC, and the source time stays one hover away. */
export function ApproachRow({ approach, selected, onSelect }: ApproachRowProps) {
  return (
    <li>
      <button
        type="button"
        className="approach-row"
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

/** The swarm's colour for the class, so a row matches its asteroid's dot in the scene. */
function ClassSwatch({ orbitClass }: { orbitClass: NeoOrbitClass | null }) {
  if (orbitClass === null) return null;
  const color = SWARM_CLASS_COLORS[NEO_ORBIT_CLASSES.indexOf(orbitClass)];
  return <span className="swatch" style={{ background: color }} aria-hidden="true" />;
}
