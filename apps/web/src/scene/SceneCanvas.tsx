import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { DevProbes } from '../dev/DevProbes';
import { CAMERA_SETTINGS, RENDERER_PARAMETERS, SCENE_BACKGROUND } from './canvasConfig';
import { CameraControls } from './camera/CameraControls';
import { Effects } from './effects/Effects';
import { OpeningDirector } from './opening/OpeningDirector';
import { SceneContents } from './SceneContents';
import type { SwarmProps } from './swarm/Swarm';

export interface SceneCanvasProps {
  swarm: SwarmProps | undefined;
  /** The catalog is no longer loading, so the opening's reveal has its swarm, or plays over the planets without. */
  openingCanStart: boolean;
}

/**
 * `CameraControls` mounts after `SceneContents` so the rig's updater runs before drei's controls each frame. The
 * director lives here rather than in `SceneContents` because it reads the browser, which the scene tests don't have.
 */
export function SceneCanvas({ swarm, openingCanStart }: SceneCanvasProps) {
  return (
    <Canvas flat gl={RENDERER_PARAMETERS} camera={CAMERA_SETTINGS}>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <OpeningDirector canStart={openingCanStart} />
      <SceneContents swarm={swarm} />
      <CameraControls />
      <Effects />
      <Stats className="fps-meter" />
      {import.meta.env.DEV && <DevProbes />}
    </Canvas>
  );
}
