import type { Clock } from '../clock.js';
import { type HttpClient, createHttpClient } from './httpClient.js';
import { UpstreamGate, gatedHttpClient } from './upstreamGate.js';

// The full SBDB NEO query returns megabytes and can take a while; the others are small.
const JPL_TIMEOUT_MS = 60_000;
const DONKI_TIMEOUT_MS = 30_000;
const MIN_REQUEST_INTERVAL_MS = 1_000;

/** One gate per host: SBDB and CAD share JPL SSD's; DONKI has CCMC's to itself. */
export function createUpstreamClients(clock: Clock): { jpl: HttpClient; donki: HttpClient } {
  const gated = (timeoutMs: number) =>
    gatedHttpClient(
      createHttpClient({ fetchImpl: fetch, timeoutMs }),
      new UpstreamGate({ minIntervalMs: MIN_REQUEST_INTERVAL_MS, clock }),
    );
  return { jpl: gated(JPL_TIMEOUT_MS), donki: gated(DONKI_TIMEOUT_MS) };
}
