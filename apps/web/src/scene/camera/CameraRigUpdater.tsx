import type { CloseApproach } from '@perihelion/data';
import type { Vector3 } from '@perihelion/orbit';
import { useFrame } from '@react-three/fiber';
import type { Camera } from 'three';
import { approachSelection } from '../../approaches/approachSelection';
import { writeDifference } from '../approach/approachCamera';
import { asteroidPositionAu } from '../approach/asteroidPosition';
import { ChaseAim } from '../approach/chaseAim';
import { passNormalForApproach } from '../approach/passNormal';
import { bodyPositions } from '../bodies/bodyPositions';
import { FRAME_PRIORITY } from '../framePriorities';
import { setSceneOrigin } from '../sceneFrame';
import { cameraRig } from './cameraRig';
import { focusPositions } from './focusPositions';

const chaseAim = new ChaseAim();
const scratchGeocentricOffsetAu: Vector3 = [0, 0, 0];
const scratchCameraOffset: Vector3 = [0, 0, 0];
const scratchDirection: Vector3 = [0, 0, 0];

interface ChaseTarget {
  approach: CloseApproach;
  distanceAu: number;
}

/**
 * The controls always orbit (0, 0, 0), because the scene origin *is* the focus. During a flight the rig sets the
 * camera's distance directly and switches the controls off, so drei does not re-clamp the distance to the new
 * focus's limits mid-flight. drei updates its controls at the same priority, so `SceneCanvas` mounts this before
 * `<CameraControls />`: equal priorities run in mount order, and the controls are off before drei looks.
 */
export function CameraRigUpdater() {
  useFrame(({ camera, controls }) => {
    const wasFlying = cameraRig.flying;
    const cameraDistanceAu = camera.position.length();
    const pose = cameraRig.update({ positions: focusPositions, cameraDistanceAu });
    setSceneOrigin(pose.originAu);
    const distanceAu = wasFlying ? pose.distanceAu : cameraDistanceAu;
    const chased = cameraRig.chasing ? approachSelection.selected : undefined;
    if (chased) aimChase(camera, { approach: chased, distanceAu });
    else if (wasFlying) camera.position.setLength(distanceAu);
    if (hasEnabledFlag(controls)) controls.enabled = !cameraRig.flying;
  }, FRAME_PRIORITY.cameraRig);
  return null;
}

/**
 * Both positions were updated this frame (`bodyPositions` priority), so their difference is the Earth→asteroid
 * line without propagating again. The direction is blended in over the flight (`ChaseAim`). The camera is turned
 * to face the focus here because the controls, which otherwise do it, are off during a flight.
 */
function aimChase(camera: Camera, target: ChaseTarget): void {
  const { position } = camera;
  writeDifference(asteroidPositionAu, bodyPositions.earthMoonBarycenter, scratchGeocentricOffsetAu);
  scratchCameraOffset[0] = position.x;
  scratchCameraOffset[1] = position.y;
  scratchCameraOffset[2] = position.z;
  const frame = {
    flightSerial: cameraRig.flightSerial,
    easedProgress: cameraRig.flightEasedProgress,
    cameraOffset: scratchCameraOffset,
    geocentricOffsetAu: scratchGeocentricOffsetAu,
    passNormal: passNormalForApproach(target.approach),
  };
  const [x, y, z] = chaseAim.write(frame, scratchDirection);
  const { distanceAu } = target;
  position.set(x * distanceAu, y * distanceAu, z * distanceAu);
  camera.lookAt(0, 0, 0);
}

/** R3F types the default controls as a bare `EventDispatcher`; it is null until the controls mount. */
function hasEnabledFlag(controls: unknown): controls is { enabled: boolean } {
  return typeof controls === 'object' && controls !== null && 'enabled' in controls;
}
