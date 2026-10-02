import { useFrame } from '@react-three/fiber';
import { useState } from 'react';

/**
 * The composer's first frame creates its bloom targets and compiles its passes (≈ 15 ms on the M3), which
 * `gl.compile(scene)` can't do ahead of time. By its second frame that work is done.
 */
export const EFFECTS_WARM_UP_FRAMES = 2;

/**
 * Mounted beside the lazy `Effects`, so it only counts once the composer is drawing. Calls `onWarm` once, so the
 * opening can wait for it rather than stall in its first frames.
 */
export function EffectsWarmUp({ onWarm }: { onWarm: () => void }) {
  const [counter] = useState(() => new FrameCounter());
  useFrame(() => {
    if (counter.next() === EFFECTS_WARM_UP_FRAMES) onWarm();
  });
  return null;
}

class FrameCounter {
  #frames = 0;

  next(): number {
    this.#frames += 1;
    return this.#frames;
  }
}
