import type { Recording } from '../examples.js';
import type { JevClient } from '../typesafe/jevClient.js';

/** Answers from the recordings; a request whose wording changed since recording fails loudly. */
export function recordedJev(recordings: readonly Recording[]): JevClient {
  const byRequest = new Map(recordings.map((r) => [JSON.stringify(r.request), r.response]));
  return {
    async ask(request) {
      const response = byRequest.get(JSON.stringify(request));
      if (!response) {
        throw new Error(
          'request not recorded: re-run npm run record --workspace @perihelion/review',
        );
      }
      return { ok: true, response };
    },
  };
}
