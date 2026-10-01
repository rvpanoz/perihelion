import type { CloseApproach } from '@perihelion/data';
import type { ReactNode } from 'react';
import { Countdown } from './Countdown';
import { type CardStat, approachCard } from './approachCardModel';

export interface ApproachCardProps {
  approach: CloseApproach;
  onFollow: (approach: CloseApproach) => void;
  onPlay: (approach: CloseApproach) => void;
  /** Task 6b's Earth-centred close-up, between the countdown and the stats. */
  closeUp?: ReactNode;
}

export function ApproachCard({ approach, onFollow, onPlay, closeUp }: ApproachCardProps) {
  const card = approachCard(approach);
  return (
    <section className="panel focus" aria-label={card.title}>
      <div className="focus-head">
        <h2 className="focus-title">{card.title}</h2>
        <span className="badge">{card.badge}</span>
      </div>
      <Countdown approach={approach} />
      {closeUp}
      <dl className="stats">
        {card.stats.map((stat) => (
          <Stat key={stat.label} stat={stat} />
        ))}
      </dl>
      <div className="focus-actions">
        <button type="button" className="btn primary" onClick={() => onFollow(approach)}>
          Follow
        </button>
        <button type="button" className="btn" onClick={() => onPlay(approach)}>
          <span aria-hidden="true">▶</span> Play approach
        </button>
      </div>
      <p className="src">{card.source}</p>
    </section>
  );
}

function Stat({ stat }: { stat: CardStat }) {
  return (
    <div className="stat" title={stat.tooltip}>
      <dt className="k">{stat.label}</dt>
      <dd className="v mono">
        {stat.value}
        {stat.detail && <small>{stat.detail}</small>}
      </dd>
    </div>
  );
}
