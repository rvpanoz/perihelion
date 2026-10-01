// Shared by the recorder and the tests. Kept free of JSON imports so the recorder can load it before the
// recordings it writes exist.
import { z } from 'zod';

/** A designation SBDB cannot know (the year is far ahead), recorded for the "not found" path. */
export const SBDB_NOT_FOUND_DESIGNATION = '2099 ZZ999';

/** One file of `sbdb.api` bodies keyed by the designation asked for. */
export const SBDB_OBJECT_LOOKUPS_FILE = 'sbdb-object-lookups.json';

/** One URL per recorded file, or `urls` for a file holding several answers (the SBDB lookups). */
export const upstreamManifestEntrySchema = z.object({
  recordedAt: z.iso.datetime().optional(),
  status: z.number().int(),
  url: z.url().optional(),
  urls: z.array(z.url()).optional(),
});
export type UpstreamManifestEntry = z.infer<typeof upstreamManifestEntrySchema>;

/** Older manifests carried one top-level `recordedAt` instead of one per entry. */
export const upstreamManifestSchema = z.object({
  recordedAt: z.iso.datetime().optional(),
  files: z.record(z.string(), upstreamManifestEntrySchema),
});
