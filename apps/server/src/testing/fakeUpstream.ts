import {
  RECORDED_CAD_WINDOW,
  RECORDED_DONKI_CME_WINDOW,
  RECORDED_SBDB_NEO_SAMPLE,
  RECORDED_SBDB_OBJECT_LOOKUPS,
} from '@perihelion/fixtures/upstream';
import { type HttpClient, UpstreamError } from '../upstream/httpClient.js';

/** `/sbdb.api` answers differ by object, so they are keyed by the designation asked for as well as the path. */
const LOOKUP_PATH = '/sbdb.api';

/**
 * Recorded bodies by upstream path; the query string does not matter to a recording, except a lookup's
 * `des`, which keys `/sbdb.api?des=<designation>`.
 */
export const RECORDED_BODIES: Readonly<Record<string, unknown>> = {
  '/sbdb_query.api': RECORDED_SBDB_NEO_SAMPLE,
  '/cad.api': RECORDED_CAD_WINDOW,
  '/DONKI-API/get/CME': RECORDED_DONKI_CME_WINDOW,
  ...recordedLookupBodies(),
};

function recordedLookupBodies(): Record<string, unknown> {
  const lookups: unknown = RECORDED_SBDB_OBJECT_LOOKUPS;
  if (typeof lookups !== 'object' || lookups === null) return {};
  return Object.fromEntries(
    Object.entries(lookups).map(([designation, body]) => [lookupKey(designation), body]),
  );
}

function lookupKey(designation: string | null): string {
  return `${LOOKUP_PATH}?des=${designation ?? ''}`;
}

function recordingKey(url: URL): string {
  return url.pathname === LOOKUP_PATH ? lookupKey(url.searchParams.get('des')) : url.pathname;
}

/** Stands in for both JPL and DONKI clients; `offline` simulates a dead network. */
export class FakeUpstream implements HttpClient {
  readonly requests: URL[] = [];
  offline = false;
  readonly #bodies: ReadonlyMap<string, unknown>;

  constructor(bodies: Readonly<Record<string, unknown>> = RECORDED_BODIES) {
    this.#bodies = new Map(Object.entries(bodies));
  }

  async getJson(url: URL): Promise<unknown> {
    this.requests.push(url);
    if (this.offline) throw new UpstreamError('network is off');
    const key = recordingKey(url);
    if (!this.#bodies.has(key)) throw new UpstreamError(`No recording for ${key}`);
    return this.#bodies.get(key);
  }
}
