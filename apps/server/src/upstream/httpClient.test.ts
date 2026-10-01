import { describe, expect, it } from 'vitest';
import { UpstreamError, createHttpClient } from './httpClient.js';

const URL_WITH_KEY = new URL(
  'https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME?startDate=2026-09-01&api_key=SECRET-KEY',
);

function clientAnswering(respond: () => Response | Promise<Response>) {
  return createHttpClient({ fetchImpl: async () => respond(), timeoutMs: 1_000 });
}

function tooManyRequests(retryAfter: string) {
  return clientAnswering(
    () => new Response('', { status: 429, headers: { 'retry-after': retryAfter } }),
  );
}

async function failureOf(promise: Promise<unknown>): Promise<UpstreamError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(UpstreamError);
  return error as UpstreamError;
}

describe('createHttpClient', () => {
  it('returns the parsed JSON body', async () => {
    const client = clientAnswering(() => Response.json({ count: 1 }));
    await expect(client.getJson(URL_WITH_KEY)).resolves.toEqual({ count: 1 });
  });

  it('reads an empty body as null', async () => {
    await expect(clientAnswering(() => new Response('')).getJson(URL_WITH_KEY)).resolves.toBeNull();
  });

  it('turns HTTP 429 into a back-off using Retry-After seconds, or a minute without it', async () => {
    expect((await failureOf(tooManyRequests('120').getJson(URL_WITH_KEY))).retryAfterMs).toBe(
      120_000,
    );
    const without = clientAnswering(() => new Response('', { status: 429 }));
    expect((await failureOf(without.getJson(URL_WITH_KEY))).retryAfterMs).toBe(60_000);
  });

  it('backs off a minute when Retry-After is not a positive number of seconds', async () => {
    for (const retryAfter of ['0', '-5', 'Wed, 21 Oct 2026 07:28:00 GMT']) {
      const error = await failureOf(tooManyRequests(retryAfter).getJson(URL_WITH_KEY));
      expect(error.retryAfterMs).toBe(60_000);
    }
  });

  it('reports other HTTP failures with the key redacted', async () => {
    const error = await failureOf(
      clientAnswering(() => new Response('', { status: 500 })).getJson(URL_WITH_KEY),
    );
    expect(error.message).toContain('HTTP 500');
    expect(error.message).not.toContain('SECRET-KEY');
    expect(error.retryAfterMs).toBeNull();
  });

  it('releases the body of a failed response so the connection can be reused', async () => {
    let cancelled = false;
    const body = new ReadableStream({ cancel: () => void (cancelled = true) });
    await failureOf(
      clientAnswering(() => new Response(body, { status: 503 })).getJson(URL_WITH_KEY),
    );
    expect(cancelled).toBe(true);
  });

  it('rejects a body that is not JSON', async () => {
    await failureOf(clientAnswering(() => new Response('<html>')).getJson(URL_WITH_KEY));
  });

  it('reports a body that breaks off mid-read without the key', async () => {
    const broken = new ReadableStream({
      start: (controller) => controller.error(new TypeError('terminated')),
    });
    const error = await failureOf(
      clientAnswering(() => new Response(broken)).getJson(URL_WITH_KEY),
    );
    expect(error.message).not.toContain('SECRET-KEY');
  });

  it('reports a network failure without the key', async () => {
    const error = await failureOf(
      clientAnswering(() => Promise.reject(new TypeError('fetch failed'))).getJson(URL_WITH_KEY),
    );
    expect(error.message).not.toContain('SECRET-KEY');
  });

  it('gives up on an upstream that never answers', async () => {
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    await failureOf(createHttpClient({ fetchImpl: hanging, timeoutMs: 10 }).getJson(URL_WITH_KEY));
  });
});
