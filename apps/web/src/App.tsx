import { useState } from 'react';
import { useNeoCatalog } from './data/useNeoCatalog';
import { SceneCanvas } from './scene/SceneCanvas';
import { FocusPicker } from './scene/camera/FocusPicker';
import { SwarmControls } from './scene/swarm/SwarmControls';
import { SwarmStatus } from './scene/swarm/SwarmStatus';
import { TimeControls } from './time/TimeControls';

export function App() {
  const neoCatalog = useNeoCatalog();
  const [showTrails, setShowTrails] = useState(true);
  const swarm =
    neoCatalog.status === 'ready' ? { catalog: neoCatalog.catalog, showTrails } : undefined;
  return (
    <>
      <SceneCanvas swarm={swarm} />
      <TimeControls />
      <FocusPicker />
      {swarm && <SwarmControls showTrails={showTrails} onShowTrailsChange={setShowTrails} />}
      <SwarmStatus state={neoCatalog} />
    </>
  );
}
