import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Profiler } from 'react';
import { describe, expect, it } from 'vitest';
import { timeStore } from '../time/timeStore';
import { SceneContents } from './SceneContents';
import { THREE_NEO_CATALOG } from './swarm/swarmTestSupport';

const J2000_JD_TDB = 2_451_545;

describe('the render loop', () => {
  it('runs 120 frames without a single React commit', async () => {
    let commits = 0;
    timeStore.scrubTo(J2000_JD_TDB);
    timeStore.setRate(1);
    timeStore.setPlaying(true);
    const renderer = await ReactThreeTestRenderer.create(
      <Profiler id="scene" onRender={() => (commits += 1)}>
        <SceneContents neoCatalog={THREE_NEO_CATALOG} />
      </Profiler>,
    );
    // The mount itself commits; seeing it proves the Profiler reports here, so 0 below is meaningful.
    expect(commits).toBeGreaterThan(0);
    commits = 0;
    // advanceFrames runs the callbacks synchronously and React commits queued updates later, so a single call for
    // all 120 frames reads 0 even when every frame sets state. act() flushes each frame's updates, as a browser would.
    for (let frame = 0; frame < 120; frame += 1) {
      await ReactThreeTestRenderer.act(() => renderer.advanceFrames(1, 1 / 60));
    }
    expect(timeStore.state.jdTdb).toBeGreaterThan(J2000_JD_TDB);
    expect(commits).toBe(0);
    await renderer.unmount();
  });
});
