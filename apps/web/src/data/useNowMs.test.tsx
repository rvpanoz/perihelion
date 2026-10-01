import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNowMs } from './useNowMs';

const START_MS = Date.parse('2026-10-01T12:00:00.000Z');

describe('useNowMs', () => {
  afterEach(() => vi.useRealTimers());

  it('advances only when the interval elapses', async () => {
    vi.useFakeTimers({ now: START_MS });
    const seen: number[] = [];
    function Probe() {
      seen.push(useNowMs(30_000));
      return <group />;
    }
    const renderer = await ReactThreeTestRenderer.create(<Probe />);
    await ReactThreeTestRenderer.act(async () => {
      vi.advanceTimersByTime(29_999);
    });
    expect(seen.at(-1)).toBe(START_MS);
    await ReactThreeTestRenderer.act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(seen.at(-1)).toBe(START_MS + 30_000);
    await renderer.unmount();
  });
});
