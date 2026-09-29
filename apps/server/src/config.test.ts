import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readServerConfig } from './config.js';

/** A path inside apps/server, whatever the working directory. */
const serverPath = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

describe('readServerConfig', () => {
  it('uses development defaults inside the server package', () => {
    expect(readServerConfig({})).toEqual({
      port: 8787,
      nasaApiKey: 'DEMO_KEY',
      usingDemoKey: true,
      databasePath: serverPath('.cache/perihelion.sqlite'),
      snapshotDirectory: serverPath('../web/public/snapshot'),
    });
  });

  it('reads the environment, treating blank values as unset', () => {
    const config = readServerConfig({
      PORT: '9000',
      NASA_API_KEY: 'abc',
      DATABASE_PATH: '',
      SNAPSHOT_DIR: '/srv/snap',
    });
    expect(config).toMatchObject({
      port: 9000,
      nasaApiKey: 'abc',
      usingDemoKey: false,
      snapshotDirectory: '/srv/snap',
    });
    expect(config.databasePath).toBe(serverPath('.cache/perihelion.sqlite'));
  });

  it('rejects a port that is not a port', () => {
    expect(() => readServerConfig({ PORT: 'http' })).toThrow(RangeError);
  });
});
