import { build } from 'esbuild';
import packageJson from '../package.json' with { type: 'json' };

// Workspace packages export TypeScript source, so they must be bundled; npm dependencies stay
// external and load from node_modules at runtime. `node:` built-ins are external on platform node.
const external = Object.keys(packageJson.dependencies).filter(
  (name) => !name.startsWith('@perihelion/'),
);

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: 'dist/main.js',
  external,
  sourcemap: true,
  logLevel: 'info',
});
