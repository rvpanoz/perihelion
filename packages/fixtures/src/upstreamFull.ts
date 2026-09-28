import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// Kept out of ./upstream: that entry must stay Node-free for packages/data's tests to typecheck.
const FULL_SBDB_NEO_RECORDING = new URL('../upstream/sbdb-neo-full.json.gz', import.meta.url);

/** The whole NEO catalogue as SBDB sent it (~40k rows); only the payload-budget test needs it. */
export function loadFullSbdbNeoResponse(): unknown {
  return JSON.parse(gunzipSync(readFileSync(FULL_SBDB_NEO_RECORDING)).toString('utf8'));
}
