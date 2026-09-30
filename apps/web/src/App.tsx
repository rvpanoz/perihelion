import { useState } from 'react';
import { useNeoCatalog } from './data/useNeoCatalog';
import { swarmStressCopiesFromUrl } from './dev/swarmStress';
import { SceneCanvas } from './scene/SceneCanvas';
import { FocusPicker } from './scene/camera/FocusPicker';
import { OpeningCaption } from './scene/opening/OpeningCaption';
import { SwarmControls } from './scene/swarm/SwarmControls';
import { SwarmStatus } from './scene/swarm/SwarmStatus';
import { TimeControls } from './time/TimeControls';

/** Read once per load; production builds drop the dev-only stress tool entirely. */
const SWARM_STRESS_COPIES = import.meta.env.DEV
  ? swarmStressCopiesFromUrl(window.location.search)
  : 1;

export function App() {
  const neoCatalog = useNeoCatalog();
  const [showTrails, setShowTrails] = useState(true);
  const swarm =
    neoCatalog.status === 'ready'
      ? { catalog: neoCatalog.catalog, showTrails, stressCopies: SWARM_STRESS_COPIES }
      : undefined;
  return (
    <>
      <SceneCanvas swarm={swarm} openingCanStart={neoCatalog.status !== 'loading'} />
      <TimeControls />
      <FocusPicker />
      {swarm && <SwarmControls showTrails={showTrails} onShowTrailsChange={setShowTrails} />}
      <SwarmStatus state={neoCatalog} />
      <OpeningCaption neoCount={swarm?.catalog.count} />
    </>
  );
}
