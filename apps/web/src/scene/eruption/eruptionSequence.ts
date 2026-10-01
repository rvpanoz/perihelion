import { cmeSelection } from '../../eruptions/cmeSelection';
import { timeStore } from '../../time/timeStore';
import { cameraRig } from '../camera/cameraRig';
import { EruptionSequence } from './eruptionPlayback';

/** The app's one eruption shot, driving the app's stores. */
export const eruptionSequence = new EruptionSequence({
  rig: cameraRig,
  time: timeStore,
  selectedCme: () => cmeSelection.selected,
});
