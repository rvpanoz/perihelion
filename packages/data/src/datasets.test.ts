import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLOSE_APPROACH_DAYS,
  datasetApiPath,
  datasetResponseSchema,
  daysQuerySchema,
  snapshotFileName,
} from './index';

describe('dataset paths', () => {
  it('serves each dataset under /api and snapshots it as <name>.json', () => {
    expect(datasetApiPath('close-approaches')).toBe('/api/close-approaches');
    expect(snapshotFileName('neos')).toBe('neos.json');
  });
});

describe('daysQuerySchema', () => {
  const schema = daysQuerySchema(DEFAULT_CLOSE_APPROACH_DAYS);

  it('defaults when days is absent and reads a whole number otherwise', () => {
    expect(schema.parse({}).days).toBe(7);
    expect(schema.parse({ days: '3' }).days).toBe(3);
  });

  it.each(['0', '61', '2.5', 'abc', '', ['1', '2']])('rejects days=%j', (days) => {
    expect(schema.safeParse({ days }).success).toBe(false);
  });
});

describe('datasetResponseSchema', () => {
  it('accepts an empty CME list served from the snapshot', () => {
    const body = { fetchedAt: '2026-09-28T12:00:00.000Z', origin: 'snapshot', data: [] };
    expect(datasetResponseSchema('cmes').parse(body)).toEqual(body);
  });

  it('rejects an origin the server never sends', () => {
    const body = { fetchedAt: '2026-09-28T12:00:00.000Z', origin: 'live', data: [] };
    expect(datasetResponseSchema('cmes').safeParse(body).success).toBe(false);
  });
});
