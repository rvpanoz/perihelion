import {
  RECORDED_CAD_WINDOW,
  RECORDED_DONKI_CME_WINDOW,
  RECORDED_SBDB_NEO_SAMPLE,
} from '@perihelion/fixtures/upstream';
import { type HttpClient, UpstreamError } from '../upstream/httpClient.js';

/** Recorded bodies by upstream path; the query string does not matter to a recording. */
export const RECORDED_BODIES: Readonly<Record<string, unknown>> = {
  '/sbdb_query.api': RECORDED_SBDB_NEO_SAMPLE,
  '/cad.api': RECORDED_CAD_WINDOW,
  '/DONKI/CME': RECORDED_DONKI_CME_WINDOW,
};

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
    if (!this.#bodies.has(url.pathname))
      throw new UpstreamError(`No recording for ${url.pathname}`);
    return this.#bodies.get(url.pathname);
  }
}
