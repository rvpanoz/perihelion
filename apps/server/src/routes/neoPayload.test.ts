import {
  NEO_PAYLOAD_BUDGET_BYTES,
  datasetResponseSchema,
  jplColumnarResponseSchema,
} from '@perihelion/data';
import { loadFullSbdbNeoResponse } from '@perihelion/fixtures/upstream-full';
import { describe, expect, it } from 'vitest';
import { FakeUpstream } from '../testing/fakeUpstream.js';
import { createTestServer } from '../testing/testServer.js';

describe('GET /api/neos with the full recorded catalogue', () => {
  it('stays inside the 2 MB gzip budget on the wire and keeps at least 99% of the NEOs', async () => {
    const recorded = loadFullSbdbNeoResponse();
    const { app } = await createTestServer({
      upstream: new FakeUpstream({ '/sbdb_query.api': recorded }),
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/neos',
      headers: { 'accept-encoding': 'gzip' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.rawPayload.byteLength).toBeLessThanOrEqual(NEO_PAYLOAD_BUDGET_BYTES);
    const unzipped = await app.inject({ method: 'GET', url: '/api/neos' });
    const { data } = datasetResponseSchema('neos').parse(unzipped.json());
    expect(data.count).toBeGreaterThanOrEqual(
      0.99 * jplColumnarResponseSchema.parse(recorded).data.length,
    );
    await app.close();
  });
});
