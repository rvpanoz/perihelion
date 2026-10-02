import { afterEach, describe, expect, it, vi } from 'vitest';
import { needsServerRetry, retryDelayMs, retryUntilAnswered } from './serverRetry';

describe('retryDelayMs', () => {
  it('doubles from 4 s and holds at 60 s', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(retryDelayMs)).toEqual([
      4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000,
    ]);
  });
});

describe('needsServerRetry', () => {
  it.each([
    [{ status: 'ready', origin: 'fresh', fetchedAt: '' } as const, false],
    [{ status: 'ready', origin: 'stale', fetchedAt: '' } as const, false],
    [{ status: 'ready', origin: 'snapshot', fetchedAt: '' } as const, true],
    [{ status: 'unavailable' } as const, true],
    [{ status: 'loading' } as const, false],
  ])('%o → %s', (state, expected) => {
    expect(needsServerRetry(state)).toBe(expected);
  });
});

describe('retryUntilAnswered', () => {
  afterEach(() => vi.useRealTimers());

  /** No answer twice, then an answer: the third retry is the one that lands. */
  function answersOnThirdTry() {
    let calls = 0;
    return vi.fn(async () => {
      calls += 1;
      return calls === 3 ? 'live' : undefined;
    });
  }

  it('waits 4 s, 8 s, then 16 s, and stops at the first answer', async () => {
    vi.useFakeTimers();
    const attempt = answersOnThirdTry();
    const onAnswer = vi.fn();
    retryUntilAnswered({ attempt, onAnswer });
    await vi.advanceTimersByTimeAsync(4_000 + 8_000 + 16_000 - 1);
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(onAnswer).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('live');
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('stops scheduling, and cancels the attempt in flight, when stopped', async () => {
    vi.useFakeTimers();
    let attemptSignal: AbortSignal | undefined;
    const attempt = vi.fn((signal: AbortSignal) => {
      attemptSignal = signal;
      return new Promise<undefined>(() => undefined);
    });
    const stop = retryUntilAnswered({ attempt, onAnswer: vi.fn() });
    await vi.advanceTimersByTimeAsync(4_000);
    stop();
    expect(attemptSignal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(attempt).toHaveBeenCalledOnce();
  });

  it('drops an answer that lands after the stop', async () => {
    vi.useFakeTimers();
    const onAnswer = vi.fn();
    let answer: (value: string) => void = () => undefined;
    const attempt = () => new Promise<string>((resolve) => (answer = resolve));
    const stop = retryUntilAnswered({ attempt, onAnswer });
    await vi.advanceTimersByTimeAsync(4_000);
    stop();
    answer('live');
    await vi.advanceTimersByTimeAsync(0);
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
