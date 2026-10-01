import type { CloseApproach } from '@perihelion/data';
import { approachPlayback, followDistanceAu } from '../scene/approach/approachCamera';
import { type CameraRig, cameraRig } from '../scene/camera/cameraRig';
import { type TimeStore, timeStore } from '../time/timeStore';
import { type ApproachSelection, approachSelection } from './approachSelection';

/** What the approach actions drive: the app's stores by default, fakes in tests. */
export interface ApproachTargets {
  selection: Pick<ApproachSelection, 'select' | 'clear'>;
  time: Pick<TimeStore, 'scrubTo' | 'setRate' | 'setPlaying'>;
  camera: Pick<CameraRig, 'focus' | 'flyTo'>;
}

const APP_TARGETS: ApproachTargets = {
  selection: approachSelection,
  time: timeStore,
  camera: cameraRig,
};

/** Selects the row and flies a chase to its asteroid, at whatever time the clock shows. */
export function followApproach(approach: CloseApproach, targets = APP_TARGETS): void {
  targets.selection.select(approach);
  flyToAsteroid(approach, targets.camera);
}

/** Selects the row, sets the clock to play its pass (`approachPlayback`), past or future, then follows it. */
export function playApproach(approach: CloseApproach, targets = APP_TARGETS): void {
  targets.selection.select(approach);
  const playback = approachPlayback(approach);
  targets.time.scrubTo(playback.startJdTdb);
  targets.time.setRate(playback.rateDaysPerSecond);
  targets.time.setPlaying(true);
  flyToAsteroid(approach, targets.camera);
}

/** The list's `onSelect`. On the asteroid, a new row replaces its position at once, so the camera flies there. */
export function selectApproach(approach: CloseApproach, targets = APP_TARGETS): void {
  if (targets.camera.focus === 'asteroid') followApproach(approach, targets);
  else targets.selection.select(approach);
}

/** Without a selection the asteroid's position stops updating, so a camera on it returns to Earth. */
export function clearApproach(targets = APP_TARGETS): void {
  targets.selection.clear();
  if (targets.camera.focus === 'asteroid') targets.camera.flyTo({ focus: 'earthMoonBarycenter' });
}

function flyToAsteroid(approach: CloseApproach, camera: ApproachTargets['camera']): void {
  camera.flyTo({ focus: 'asteroid', distanceAu: followDistanceAu(approach), chase: true });
}
