import { useNeoCatalog } from './data/useNeoCatalog';
import { SceneCanvas } from './scene/SceneCanvas';
import { FocusPicker } from './scene/camera/FocusPicker';
import { SwarmStatus } from './scene/swarm/SwarmStatus';
import { TimeControls } from './time/TimeControls';

export function App() {
  const neoCatalog = useNeoCatalog();
  return (
    <>
      <SceneCanvas neoCatalog={neoCatalog.status === 'ready' ? neoCatalog.catalog : undefined} />
      <TimeControls />
      <FocusPicker />
      <SwarmStatus state={neoCatalog} />
    </>
  );
}
