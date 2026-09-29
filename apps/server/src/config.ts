import { fileURLToPath } from 'node:url';

type Environment = Readonly<Record<string, string | undefined>>;

export interface ServerConfig {
  port: number;
  nasaApiKey: string;
  usingDemoKey: boolean;
  /** Defaults sit inside apps/server; relative env values resolve against the working directory. */
  databasePath: string;
  snapshotDirectory: string;
}

const DEFAULT_PORT = 8787;
const MAX_PORT = 65_535;
// NASA's public shared key: enough for an hourly cached refresh, but heavily rate-limited (PROGRESS.md).
const DEMO_API_KEY = 'DEMO_KEY';
// src/config.ts and the bundled dist/main.js are both one level below the package root, so the defaults
// don't depend on where the server is started (esbuild keeps import.meta.url in ESM output).
const SERVER_ROOT = new URL('..', import.meta.url);
const DEFAULT_DATABASE_PATH = fileURLToPath(new URL('.cache/perihelion.sqlite', SERVER_ROOT));
const DEFAULT_SNAPSHOT_DIRECTORY = fileURLToPath(new URL('../web/public/snapshot', SERVER_ROOT));

export function readServerConfig(env: Environment): ServerConfig {
  const nasaApiKey = nonBlank(env['NASA_API_KEY']);
  return {
    port: readPort(nonBlank(env['PORT'])),
    nasaApiKey: nasaApiKey ?? DEMO_API_KEY,
    usingDemoKey: nasaApiKey === undefined,
    databasePath: nonBlank(env['DATABASE_PATH']) ?? DEFAULT_DATABASE_PATH,
    snapshotDirectory: nonBlank(env['SNAPSHOT_DIR']) ?? DEFAULT_SNAPSHOT_DIRECTORY,
  };
}

function readPort(text: string | undefined): number {
  const port = Number(text ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 0 || port > MAX_PORT)
    throw new RangeError(`PORT is not a port: ${text}`);
  return port;
}

function nonBlank(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}
