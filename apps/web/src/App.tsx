import { SceneCanvas } from './scene/SceneCanvas';
import { FocusPicker } from './scene/camera/FocusPicker';
import { TimeControls } from './time/TimeControls';

export function App() {
  return (
    <>
      <SceneCanvas />
      <TimeControls />
      <FocusPicker />
    </>
  );
}
