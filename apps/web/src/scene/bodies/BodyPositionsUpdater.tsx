import { useFrame } from '@react-three/fiber';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { bodyPositions, updateBodyPositions } from './bodyPositions';

export function BodyPositionsUpdater() {
  useFrame(
    () => updateBodyPositions(bodyPositions, timeStore.state.jdTdb),
    FRAME_PRIORITY.bodyPositions,
  );
  return null;
}
