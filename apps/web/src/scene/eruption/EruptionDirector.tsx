import { useFrame } from '@react-three/fiber';
import { FRAME_PRIORITY } from '../framePriorities';
import { eruptionSequence } from './eruptionSequence';

/** Runs before the clock ticks, so a beat's rate applies from the frame the clock enters it. */
export function EruptionDirector() {
  useFrame(() => eruptionSequence.advance(), FRAME_PRIORITY.opening);
  return null;
}
