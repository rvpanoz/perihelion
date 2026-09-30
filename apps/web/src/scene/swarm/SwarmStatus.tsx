import type { NeoCatalogState } from '../../data/useNeoCatalog';
import { swarmStatusText } from './swarmStatusText';

export function SwarmStatus({ state }: { state: NeoCatalogState }) {
  return (
    <p className="hud swarm-status" role="status">
      {swarmStatusText(state)}
    </p>
  );
}
