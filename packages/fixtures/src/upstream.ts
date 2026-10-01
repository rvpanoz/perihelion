// Raw upstream bodies recorded by `npm run record` (apps/server/scripts/recordUpstream.ts).
// Typed as unknown on purpose: consumers must validate them exactly as the server validates live data.
import cadEmpty from '../upstream/cad-empty.json' with { type: 'json' };
import cadWindow from '../upstream/cad-window.json' with { type: 'json' };
import donkiCmeEmpty from '../upstream/donki-cme-empty.json' with { type: 'json' };
import donkiCmeWindow from '../upstream/donki-cme-window.json' with { type: 'json' };
import manifest from '../upstream/manifest.json' with { type: 'json' };
import sbdbNeoSample from '../upstream/sbdb-neo-sample.json' with { type: 'json' };
import sbdbObjectLookups from '../upstream/sbdb-object-lookups.json' with { type: 'json' };

export { SBDB_NOT_FOUND_DESIGNATION } from './upstreamManifest';

export const RECORDED_SBDB_NEO_SAMPLE: unknown = sbdbNeoSample;
export const RECORDED_CAD_WINDOW: unknown = cadWindow;
export const RECORDED_CAD_EMPTY: unknown = cadEmpty;
export const RECORDED_DONKI_CME_WINDOW: unknown = donkiCmeWindow;
export const RECORDED_DONKI_CME_EMPTY: unknown = donkiCmeEmpty;
export const RECORDED_UPSTREAM_MANIFEST: unknown = manifest;
/** `sbdb.api` answers keyed by the designation asked for, including one "not found". */
export const RECORDED_SBDB_OBJECT_LOOKUPS: unknown = sbdbObjectLookups;
