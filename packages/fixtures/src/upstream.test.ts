import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  RECORDED_CAD_EMPTY,
  RECORDED_DONKI_CME_EMPTY,
  RECORDED_SBDB_NEO_SAMPLE,
  RECORDED_UPSTREAM_MANIFEST,
} from './upstream';

const manifestSchema = z.object({
  recordedAt: z.iso.datetime(),
  files: z.record(z.string(), z.object({ url: z.url(), status: z.literal(200) })),
});

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

  it('list every recording in the manifest without an API key', () => {
    const { files } = manifestSchema.parse(RECORDED_UPSTREAM_MANIFEST);
    expect(Object.keys(files)).toHaveLength(6);
    for (const { url } of Object.values(files)) {
      expect(new URL(url).searchParams.get('api_key') ?? 'REDACTED').toBe('REDACTED');
    }
  });
});
