import { NEO_ORBIT_CLASSES } from '@perihelion/data';
import { useId } from 'react';
import { orbitClassLabel } from '../approaches/approachFormat';
import type { NeoCatalogSummary } from '../data/neoCatalogMessage';
import { ClassSwatch } from './ClassSwatch';

const GROUPED = new Intl.NumberFormat('en-US');

export type OrbitClassLegendProps = Pick<NeoCatalogSummary, 'count' | 'orbitClassCounts'>;

/**
 * The swarm's colour key, after the mockup's legend without its per-class toggles. Classes run from the Sun
 * outwards (`NEO_ORBIT_CLASSES` order) rather than by count, so rows never trade places when live data replaces
 * the snapshot. The counts are the catalog's, so they are facts.
 */
export function OrbitClassLegend({ count, orbitClassCounts }: OrbitClassLegendProps) {
  const headingId = useId();
  return (
    <section className="panel legend" aria-labelledby={headingId}>
      <h2 className="approach-list-heading" id={headingId}>
        <span>Orbit class</span>
        <span className="mono">{`${GROUPED.format(count)} objects`}</span>
      </h2>
      <ul className="legend-rows">
        {NEO_ORBIT_CLASSES.map((orbitClass) => (
          <li className="legend-row" key={orbitClass}>
            <ClassSwatch orbitClass={orbitClass} />
            <span className="legend-name">{orbitClassLabel(orbitClass)}</span>
            <span className="legend-count mono">
              {GROUPED.format(orbitClassCounts[orbitClass])}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
