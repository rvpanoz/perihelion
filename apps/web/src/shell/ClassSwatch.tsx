import { NEO_ORBIT_CLASSES, type NeoOrbitClass } from '@perihelion/data';
import { SWARM_CLASS_COLORS } from '../scene/swarm/swarmLook';

/** The swarm's colour for the class, so a row or a legend entry matches its asteroids' dots in the scene. */
export function ClassSwatch({ orbitClass }: { orbitClass: NeoOrbitClass | null }) {
  if (orbitClass === null) return null;
  const color = SWARM_CLASS_COLORS[NEO_ORBIT_CLASSES.indexOf(orbitClass)];
  return <span className="swatch" style={{ background: color }} aria-hidden="true" />;
}
