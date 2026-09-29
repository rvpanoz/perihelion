import { useFrame } from '@react-three/fiber';
import { timeStore } from '../time/timeStore';
import { FRAME_PRIORITY } from './framePriorities';

export function SimulationClock() {
  useFrame((_, deltaSeconds) => timeStore.tick(deltaSeconds), FRAME_PRIORITY.clock);
  return null;
}
