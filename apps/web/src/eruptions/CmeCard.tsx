import type { Cme } from '@perihelion/data';
import type { ReactNode } from 'react';
import { StatItem } from '../shell/StatItem';
import { cmeCard } from './cmeCardModel';

export interface CmeCardProps {
  cme: Cme;
  /** Task 9's Watch eruption, under the arrival line. */
  actions?: ReactNode;
}

export function CmeCard({ cme, actions }: CmeCardProps) {
  const card = cmeCard(cme);
  return (
    <section className="panel focus cme-card" aria-label={card.title}>
      <div className="focus-head">
        <h2 className="focus-title">{card.title}</h2>
        <span className="badge cme-badge">{card.badge}</span>
      </div>
      <p className="countdown mono">{card.subtitle}</p>
      <dl className="stats cme-stats">
        {card.stats.map((stat) => (
          <StatItem key={stat.label} stat={stat} />
        ))}
      </dl>
      <p className="cme-arrival">{card.arrival}</p>
      {actions}
      <p className="src">
        {card.source}
        {card.link && (
          <>
            {' · '}
            <a href={card.link} target="_blank" rel="noreferrer">
              DONKI entry
            </a>
          </>
        )}
      </p>
    </section>
  );
}
