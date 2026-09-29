import { useFrame } from '@react-three/fiber';
import { bodyPositions } from '../bodies/bodyPositions';
import { FRAME_PRIORITY } from '../framePriorities';
import { setSceneOrigin } from '../sceneFrame';
import { cameraRig } from './cameraRig';

/**
 * The controls always orbit (0, 0, 0), because the scene origin *is* the focus. During a flight the rig sets the
 * camera's distance directly and switches the controls off, so drei does not re-clamp the distance to the new
 * focus's limits mid-flight. drei updates its controls at the same priority, so `SceneCanvas` mounts this before
 * `<CameraControls />`: equal priorities run in mount order, and the controls are off before drei looks.
 */
export function CameraRigUpdater() {
  useFrame(({ camera, controls }) => {
    const wasFlying = cameraRig.flying;
    const pose = cameraRig.update({ bodyPositions, cameraDistanceAu: camera.position.length() });
    setSceneOrigin(pose.originAu);
    if (wasFlying) camera.position.setLength(pose.distanceAu);
    if (hasEnabledFlag(controls)) controls.enabled = !cameraRig.flying;
  }, FRAME_PRIORITY.cameraRig);
  return null;
}

/** R3F types the default controls as a bare `EventDispatcher`; it is null until the controls mount. */
function hasEnabledFlag(controls: unknown): controls is { enabled: boolean } {
  return typeof controls === 'object' && controls !== null && 'enabled' in controls;
}
