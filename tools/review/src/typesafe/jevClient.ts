import { type JevResponse, jevResponseSchema } from './jevResponse.js';

/** Pinned so the measured confidence cutoff stays valid; upgrading means re-recording (plan deviation 1). */
export const JEV_MODEL = 'jev-1.13.0';
const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
// TypeSafe asks clients to back off on rate limiting (429) and overload (529); nothing else is retried.
const RETRYABLE_STATUSES = new Set([429, 529]);
const MAX_ATTEMPTS = 3;
const FIRST_BACKOFF_MS = 1_000;

export type NoulQuestion = {
  type: 'noul';
  instructions: string;
  criteria?: { true: string; false: string };
};

export type ChoiceQuestion = {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
};

export interface JevRequest {
  state: unknown;
  questions: Record<string, NoulQuestion | ChoiceQuestion>;
}

export type JevResult = { ok: true; response: JevResponse } | { ok: false; reason: string };

export interface JevClient {
  ask(request: JevRequest): Promise<JevResult>;
}

export interface JevClientOptions {
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
  timeoutMs: number;
  sleep?: (ms: number) => Promise<void>;
}

type KeyedOptions = JevClientOptions & { apiKey: string };

interface AttemptOutcome {
  result: JevResult;
  retryable: boolean;
}

interface Posted {
  status: number;
  ok: boolean;
  body: string;
}

export function createJevClient(options: JevClientOptions): JevClient {
  return {
    async ask(request) {
      const { apiKey } = options;
      if (!apiKey) return { ok: false, reason: 'TYPESAFE_API_KEY is not set' };
      return askWithRetries(request, { ...options, apiKey });
    },
  };
}

async function askWithRetries(request: JevRequest, options: KeyedOptions): Promise<JevResult> {
  const sleep = options.sleep ?? delay;
  let outcome = await attempt(request, options);
  for (let retry = 1; retry < MAX_ATTEMPTS && outcome.retryable; retry++) {
    await sleep(FIRST_BACKOFF_MS * 2 ** (retry - 1));
    outcome = await attempt(request, options);
  }
  return outcome.result;
}

async function attempt(request: JevRequest, options: KeyedOptions): Promise<AttemptOutcome> {
  const posted = await postOrReason(request, options);
  if (typeof posted === 'string') return failed(posted, false);
  if (!posted.ok) return failed(`HTTP ${posted.status}`, RETRYABLE_STATUSES.has(posted.status));
  return { result: parseResponse(posted.body), retryable: false };
}

/** The only place a request can throw; the timeout uses setTimeout so fake timers drive it in tests. */
async function postOrReason(request: JevRequest, options: KeyedOptions): Promise<Posted | string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const init = requestInit(request, { apiKey: options.apiKey, controller });
    const response = await options.fetchImpl(JEV_URL, init);
    return { status: response.status, ok: response.ok, body: await response.text() };
  } catch (error) {
    return `request failed: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    clearTimeout(timer);
  }
}

function requestInit(
  request: JevRequest,
  { apiKey, controller }: { apiKey: string; controller: AbortController },
): RequestInit {
  return {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: JEV_MODEL, ...request }),
    signal: controller.signal,
  };
}

function parseResponse(body: string): JevResult {
  const parsed = jevResponseSchema.safeParse(jsonOrUndefined(body));
  return parsed.success
    ? { ok: true, response: parsed.data }
    : { ok: false, reason: 'response did not match the expected shape' };
}

function jsonOrUndefined(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function failed(reason: string, retryable: boolean): AttemptOutcome {
  return { result: { ok: false, reason }, retryable };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
