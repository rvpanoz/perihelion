import type { DatasetResponse } from '@perihelion/data';
import { describe, expect, it, vi } from 'vitest';
import { buildSwarmAttributes, SWARM_ATTRIBUTE_NAMES } from '../scene/swarm/swarmAttributes';
import { J2000_JD_TDB, THREE_NEO_CATALOG, catalogOf } from '../scene/swarm/swarmTestSupport';
import { loadNeoCatalogMessage, neoCatalogMessage } from './neoCatalogMessage';

const RESPONSE: DatasetResponse<'neos'> = {
  fetchedAt: '2026-09-30T12:00:00.000Z',
  data: THREE_NEO_CATALOG,
  origin: 'fresh',
};

describe('neoCatalogMessage', () => {
  it('carries the dataset metadata the main thread shows', () => {
    const { message } = neoCatalogMessage(RESPONSE, J2000_JD_TDB);
    expect(message).toMatchObject({ kind: 'ready' });
    expect(message.kind === 'ready' && message.summary).toMatchObject({
      origin: 'fresh',
      fetchedAt: RESPONSE.fetchedAt,
      count: 3,
    });
  });

  it('counts the NEOs in each orbit class, zero for a class with none', () => {
    const catalog = catalogOf({
      ...THREE_NEO_CATALOG,
      count: 3,
      orbitClass: ['APO', 'APO', 'AMO'],
    });
    const { message } = neoCatalogMessage({ ...RESPONSE, data: catalog }, J2000_JD_TDB);
    expect(message.kind === 'ready' && message.summary.orbitClassCounts).toEqual({
      IEO: 0,
      ATE: 0,
      APO: 2,
      AMO: 1,
    });
  });

  it('holds the same swarm attributes the main thread would build', () => {
    const { message } = neoCatalogMessage(RESPONSE, J2000_JD_TDB);
    expect(message.kind === 'ready' && message.summary.attributes).toEqual(
      buildSwarmAttributes(THREE_NEO_CATALOG, J2000_JD_TDB),
    );
  });

  it('transfers every attribute buffer rather than copying it', () => {
    const { message, transfer } = neoCatalogMessage(RESPONSE, J2000_JD_TDB);
    if (message.kind !== 'ready') throw new Error('Expected a ready message');
    const buffers = SWARM_ATTRIBUTE_NAMES.map((name) => message.summary.attributes[name].buffer);
    expect(transfer).toHaveLength(buffers.length);
    buffers.forEach((buffer, index) => expect(transfer[index]).toBe(buffer));
  });
});

describe('loadNeoCatalogMessage', () => {
  it('builds the message at the requested reference epoch', async () => {
    const load = vi.fn(() => Promise.resolve(RESPONSE));
    const { message } = await loadNeoCatalogMessage({ referenceJdTdb: J2000_JD_TDB + 10 }, load);
    expect(message.kind === 'ready' && message.summary.attributes.referenceJdTdb).toBe(
      J2000_JD_TDB + 10,
    );
  });

  it('reports the catalog unavailable when the server and the snapshot both fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const load = () => Promise.reject(new Error('both failed'));
    const postable = await loadNeoCatalogMessage({ referenceJdTdb: J2000_JD_TDB }, load);
    expect(postable).toEqual({ message: { kind: 'unavailable' }, transfer: [] });
  });
});
