import type { NeoCatalog } from '@perihelion/data';
import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { CAMERA_SETTINGS, RENDERER_PARAMETERS, SCENE_BACKGROUND } from './canvasConfig';
import { CameraControls } from './camera/CameraControls';
import { Effects } from './effects/Effects';
import { SceneContents } from './SceneContents';

/** `CameraControls` mounts after `SceneContents` so the rig's updater runs before drei's controls each frame. */
export function SceneCanvas({ neoCatalog }: { neoCatalog: NeoCatalog | undefined }) {
  return (
    <Canvas flat gl={RENDERER_PARAMETERS} camera={CAMERA_SETTINGS}>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <SceneContents neoCatalog={neoCatalog} />
      <CameraControls />
      <Effects />
      <Stats />
    </Canvas>
  );
}
