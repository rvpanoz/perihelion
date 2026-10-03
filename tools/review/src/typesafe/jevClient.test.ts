import { afterEach, describe, expect, it, vi } from 'vitest';
import { type JevClientOptions, type JevRequest, createJevClient } from './jevClient.js';
import { type JevResponse, choiceOf, noulOf } from './jevResponse.js';

const TIMEOUT_MS = 5_000;

const REQUEST: JevRequest = {
  state: { title: 'Deploy: Netlify and Render' },
  questions: { web: { type: 'noul', instructions: 'Does `title` involve the web app?' } },
};

// Shape recorded from jev-1.13.0 on 2026-10-03.
const VALID_ANSWER = {
  model: 'jev-1.13.0',
  answers: {
    type: {
      type: 'choice',
      choice: 'chore',
      confidence: 1.0,
      probabilities: { chore: 1.0, fix: 0.0 },
    },
    web: { type: 'noul', noul: 0.94 },
  },
  usage: { input_tokens: 632, output_tokens: 132 },
};

interface Harness {
  options: JevClientOptions;
  calls: { url: string; init: RequestInit }[];
  sleeps: number[];
}

function harness(
  respond: (call: number, init: RequestInit) => Response | Promise<Response>,
  key: { apiKey: string | undefined } = { apiKey: 'test-key' },
): Harness {
  const calls: Harness['calls'] = [];
  const sleeps: number[] = [];
  const fetchImpl = async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return respond(calls.length, init);
  };
  const sleep = async (ms: number) => void sleeps.push(ms);
  return {
    options: { apiKey: key.apiKey, fetchImpl, timeoutMs: TIMEOUT_MS, sleep },
    calls,
    sleeps,
  };
}

function statuses(...codes: number[]) {
  return (call: number) => {
    const status = codes[call - 1] ?? 200;
    return status === 200 ? Response.json(VALID_ANSWER) : new Response('', { status });
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('createJevClient', () => {
  it('posts the pinned model, state and questions with the bearer key', async () => {
    const { options, calls } = harness(() => Response.json(VALID_ANSWER));
    const result = await createJevClient(options).ask(REQUEST);

    expect(result).toEqual({ ok: true, response: VALID_ANSWER });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers).toEqual({
      authorization: 'Bearer test-key',
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(call?.init.body))).toEqual({ model: 'jev-1.13.0', ...REQUEST });
  });

  it('answers without a request when the key is missing or empty', async () => {
    for (const apiKey of [undefined, '']) {
      const { options, calls } = harness(() => Response.json(VALID_ANSWER), { apiKey });
      const result = await createJevClient(options).ask(REQUEST);
      expect(result.ok).toBe(false);
      expect(calls).toHaveLength(0);
    }
  });

  it('retries rate limiting and overload with exponential back-off', async () => {
    const { options, calls, sleeps } = harness(statuses(429, 529, 200));
    const result = await createJevClient(options).ask(REQUEST);

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(3);
    expect(sleeps).toEqual([1_000, 2_000]);
  });

  it('gives up after three rate-limited attempts', async () => {
    const { options, calls } = harness(statuses(429, 429, 429));
    const result = await createJevClient(options).ask(REQUEST);

    expect(calls).toHaveLength(3);
    expect(result).toEqual({ ok: false, reason: 'HTTP 429' });
  });

  it('does not retry an authentication failure and never reports the key', async () => {
    const { options, calls } = harness(statuses(401));
    const result = await createJevClient(options).ask(REQUEST);

    expect(calls).toHaveLength(1);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('test-key');
  });

  it('rejects a body that is not JSON or not the expected shape', async () => {
    const bodies = [new Response('<html>'), Response.json({ model: 'jev-1.13.0', usage: {} })];
    for (const body of bodies) {
      const { options } = harness(() => body);
      expect((await createJevClient(options).ask(REQUEST)).ok).toBe(false);
    }
  });

  it('gives up when the answer takes longer than the timeout', async () => {
    vi.useFakeTimers();
    const { options } = harness(
      (_call, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = createJevClient(options).ask(REQUEST);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    expect((await pending).ok).toBe(false);
  });

  it('reports a network error without retrying', async () => {
    const { options, calls } = harness(() => {
      throw new TypeError('fetch failed');
    });
    const result = await createJevClient(options).ask(REQUEST);

    expect(calls).toHaveLength(1);
    expect(result).toEqual({ ok: false, reason: 'request failed: fetch failed' });
  });
});

describe('answer readers', () => {
  const response = VALID_ANSWER as JevResponse;

  it('reads a Noul only from a Noul answer', () => {
    expect(noulOf(response, 'web')).toBe(0.94);
    expect(noulOf(response, 'type')).toBeNull();
    expect(noulOf(response, 'missing')).toBeNull();
  });

  it('reads a Choice only from a Choice answer', () => {
    expect(choiceOf(response, 'type')).toEqual({ choice: 'chore', confidence: 1.0 });
    expect(choiceOf(response, 'web')).toBeNull();
    expect(choiceOf(response, 'missing')).toBeNull();
  });
});
