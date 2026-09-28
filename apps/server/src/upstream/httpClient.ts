import { redactedUrl } from './upstreamUrl.js';

/** Anything that stops an upstream answer from being usable; callers fall back instead of failing. */
export class UpstreamError extends Error {
  override name = 'UpstreamError';

  /** Set only when upstream asked us to slow down (HTTP 429). */
  constructor(
    message: string,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

/** The only network seam: production passes global fetch, tests pass recordings. */
export interface HttpClient {
  getJson(url: URL): Promise<unknown>;
}

interface HttpClientOptions {
  fetchImpl: typeof fetch;
  timeoutMs: number;
}

const HTTP_TOO_MANY_REQUESTS = 429;
const DEFAULT_RETRY_AFTER_MS = 60_000;
const MS_PER_SECOND = 1_000;

export function createHttpClient(options: HttpClientOptions): HttpClient {
  return {
    async getJson(url) {
      const response = await fetchOrThrow(url, options);
      if (!response.ok) throw await statusError(response, url);
      return parseBody(await readTextOrThrow(response, url), url);
    },
  };
}

async function fetchOrThrow(
  url: URL,
  { fetchImpl, timeoutMs }: HttpClientOptions,
): Promise<Response> {
  try {
    return await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new UpstreamError(`Request to ${redactedUrl(url)} failed: ${messageOf(error)}`);
  }
}

async function statusError(response: Response, url: URL): Promise<UpstreamError> {
  await discardBody(response);
  const message = `HTTP ${response.status} from ${redactedUrl(url)}`;
  if (response.status !== HTTP_TOO_MANY_REQUESTS) return new UpstreamError(message);
  return new UpstreamError(message, retryAfterMsOf(response));
}

/** An unread body holds Node's connection until garbage collection; a discarded body may fail freely. */
async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

/**
 * Retry-After in seconds (RFC 9110 §10.2.3). A zero or negative value would lift the back-off at once, and the
 * HTTP-date form is not worth parsing for a fallback, so both get the default.
 */
function retryAfterMsOf(response: Response): number {
  const retryAfterSeconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds * MS_PER_SECOND
    : DEFAULT_RETRY_AFTER_MS;
}

/** The timeout also covers the body, and a connection can drop mid-body; both must surface as UpstreamError. */
async function readTextOrThrow(response: Response, url: URL): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    throw new UpstreamError(
      `Reading the body from ${redactedUrl(url)} failed: ${messageOf(error)}`,
    );
  }
}

/** DONKI has answered an empty window with an empty body; null lets its schema decide. */
function parseBody(text: string, url: URL): unknown {
  if (text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamError(`Body from ${redactedUrl(url)} is not JSON`);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
