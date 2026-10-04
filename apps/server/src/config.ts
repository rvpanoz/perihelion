import { fileURLToPath } from 'node:url';

type Environment = Readonly<Record<string, string | undefined>>;

export interface ServerConfig {
  port: number;
  /** Loopback by default so a dev server is not exposed; a host such as Render sets HOST=0.0.0.0. */
  host: string;
  /** Defaults sit inside apps/server; relative env values resolve against the working directory. */
  databasePath: string;
  snapshotDirectory: string;
}

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = '127.0.0.1';
const MAX_PORT = 65_535;
// src/config.ts and the bundled dist/main.js are both one level below the package root, so the defaults
// don't depend on where the server is started (esbuild keeps import.meta.url in ESM output).
const SERVER_ROOT = new URL('..', import.meta.url);
const DEFAULT_DATABASE_PATH = fileURLToPath(new URL('.cache/perihelion.sqlite', SERVER_ROOT));
const DEFAULT_SNAPSHOT_DIRECTORY = fileURLToPath(new URL('../web/public/snapshot', SERVER_ROOT));

export function readServerConfig(env: Environment): ServerConfig {
  return {
    port: readPort(nonBlank(env['PORT'])),
    host: nonBlank(env['HOST']) ?? DEFAULT_HOST,
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
