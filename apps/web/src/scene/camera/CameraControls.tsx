import { OrbitControls } from '@react-three/drei';
import { useSyncExternalStore } from 'react';
import { cameraRig } from './cameraRig';
import { MAX_VIEW_DISTANCE_AU, minViewDistanceAu } from './viewDistances';

/** Kept apart from `CameraRigUpdater` because drei's controls cannot mount under the test renderer. */
export function CameraControls() {
  const focus = useSyncExternalStore(cameraRig.subscribe, () => cameraRig.focus);
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      target={[0, 0, 0]}
      minDistance={minViewDistanceAu(focus)}
      maxDistance={MAX_VIEW_DISTANCE_AU}
      onStart={() => cameraRig.stopChase()}
    />
  );
}
