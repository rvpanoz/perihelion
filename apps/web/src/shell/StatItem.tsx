import type { CardStat } from '../approaches/approachCardModel';

/** One label/value pair of a focus card's `<dl>`; the detail sits under the value. */
export function StatItem({ stat }: { stat: CardStat }) {
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
