import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { EFFECTS_WARM_UP_FRAMES, EffectsWarmUp } from './EffectsWarmUp';

describe('EffectsWarmUp', () => {
  it('reports warm once, after the composer has drawn its warm-up frames', async () => {
    const onWarm = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(<EffectsWarmUp onWarm={onWarm} />);
    await renderer.advanceFrames(EFFECTS_WARM_UP_FRAMES - 1, 1 / 60);
    expect(onWarm).not.toHaveBeenCalled();
    await renderer.advanceFrames(1, 1 / 60);
    expect(onWarm).toHaveBeenCalledTimes(1);
    await renderer.advanceFrames(10, 1 / 60);
    expect(onWarm).toHaveBeenCalledTimes(1);
    await renderer.unmount();
  });
});
