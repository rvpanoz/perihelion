import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  RECORDED_CAD_EMPTY,
  RECORDED_DONKI_CME_EMPTY,
  RECORDED_SBDB_NEO_SAMPLE,
  RECORDED_SBDB_OBJECT_LOOKUPS,
  RECORDED_UPSTREAM_MANIFEST,
  SBDB_NOT_FOUND_DESIGNATION,
} from './upstream';
import { upstreamManifestSchema } from './upstreamManifest';

describe('recorded upstream responses', () => {
  it('include an SBDB sample carrying the requested element fields', () => {
    expect(RECORDED_SBDB_NEO_SAMPLE).toMatchObject({
      fields: expect.arrayContaining(['pdes', 'epoch', 'e', 'a', 'i', 'om', 'w', 'ma', 'class']),
    });
  });

  it('include a CAD answer with no matches', () => {
    expect(z.object({ count: z.coerce.number() }).parse(RECORDED_CAD_EMPTY).count).toBe(0);
  });

  it('include an empty DONKI window', () => {
    expect(RECORDED_DONKI_CME_EMPTY).toEqual([]);
  });

  it('include SBDB object lookups, one of them for a designation SBDB does not know', () => {
    const lookups = z.record(z.string(), z.unknown()).parse(RECORDED_SBDB_OBJECT_LOOKUPS);
    expect(Object.keys(lookups).length).toBeGreaterThanOrEqual(2);
    expect(lookups[SBDB_NOT_FOUND_DESIGNATION]).toMatchObject({
      message: 'specified object was not found',
    });
  });

  it('list every recording in the manifest, each dated, without an API key', () => {
    const { files } = upstreamManifestSchema.parse(RECORDED_UPSTREAM_MANIFEST);
    expect(Object.keys(files)).toHaveLength(7);
    for (const entry of Object.values(files)) {
      expect(entry).toMatchObject({ recordedAt: expect.any(String), status: 200 });
      const urls = entry.urls ?? (entry.url === undefined ? [] : [entry.url]);
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(new URL(url).searchParams.get('api_key') ?? 'REDACTED').toBe('REDACTED');
      }
    }
  });
});
