import { describe, expect, it, vi } from 'vitest';
import { TestClock } from '../testing/testClock.js';
import { UpstreamError } from './httpClient.js';
import { UpstreamGate } from './upstreamGate.js';

function gateWithFakeTime(minIntervalMs = 1_000) {
  const clock = new TestClock(0);
  const sleeps: number[] = [];
  const sleep = async (ms: number) => {
    sleeps.push(ms);
    clock.advance(ms);
  };
  return { gate: new UpstreamGate({ minIntervalMs, clock, sleep }), clock, sleeps };
}

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe('UpstreamGate', () => {
  it('spaces consecutive requests by the minimum interval', async () => {
    const { gate, sleeps } = gateWithFakeTime();
    await gate.run(async () => 'first');
    await gate.run(async () => 'second');
    expect(sleeps).toEqual([1_000]);
  });

  it('runs one request at a time', async () => {
    const { gate } = gateWithFakeTime(0);
    const first = deferred();
    const started: string[] = [];
    const one = gate.run(async () => {
      started.push('one');
      await first.promise;
    });
    const two = gate.run(async () => {
      started.push('two');
    });
    await vi.waitFor(() => expect(started).toEqual(['one']));
    // Give the second task every chance to jump the queue before releasing the first.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(started).toEqual(['one']);
    first.resolve();
    await Promise.all([one, two]);
    expect(started).toEqual(['one', 'two']);
  });

  it('refuses requests while backing off after a 429, then resumes', async () => {
    const { gate, clock } = gateWithFakeTime(0);
    await expect(
      gate.run(() => Promise.reject(new UpstreamError('HTTP 429', 30_000))),
    ).rejects.toThrow('HTTP 429');
    let called = false;
    await expect(gate.run(async () => (called = true))).rejects.toThrow(/back off/);
    expect(called).toBe(false);
    clock.advance(30_000);
    await expect(gate.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('keeps the queue moving after a failed request', async () => {
    const { gate } = gateWithFakeTime(0);
    await expect(gate.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(gate.run(async () => 'ok')).resolves.toBe('ok');
  });
});
