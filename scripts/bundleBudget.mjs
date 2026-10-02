// Fails `npm run check` when the JS a first visit must download before anything draws grows past the budget.
// Only what index.html loads up front counts (the entry script and its modulepreloads); chunks loaded later don't
// delay the first frame.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { constants, gzipSync } from 'node:zlib';

const DIST_DIR = 'apps/web/dist';
// Phase 7 baseline 391,142 bytes (2026-10-02); 370,460 once postprocessing moved to its own chunk (Task 4),
// rounded up to the next 10 kB so it can only stop growth.
const INITIAL_JS_GZIP_BUDGET_BYTES = 380_000;
// Fixed so the number means the same thing on every machine; Node's default level, close to what hosts serve.
const GZIP_LEVEL = constants.Z_DEFAULT_COMPRESSION;

const UP_FRONT_SCRIPT = /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+\.js)"/g;
const MODULE_PRELOAD = /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+\.js)"/g;

function upFrontScriptPaths(html) {
  const matches = [...html.matchAll(UP_FRONT_SCRIPT), ...html.matchAll(MODULE_PRELOAD)];
  return [...new Set(matches.map((match) => match[1]))];
}

function gzipBytes(publicPath) {
  const source = readFileSync(join(DIST_DIR, publicPath.replace(/^\//, '')));
  return gzipSync(source, { level: GZIP_LEVEL }).length;
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} B`;
}

const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
const scripts = upFrontScriptPaths(html).map((path) => ({ path, gzipBytes: gzipBytes(path) }));
if (scripts.length === 0) throw new Error(`No up-front scripts found in ${DIST_DIR}/index.html`);
const totalBytes = scripts.reduce((sum, script) => sum + script.gzipBytes, 0);

for (const script of scripts)
  console.log(`  ${script.path}  ${formatBytes(script.gzipBytes)} gzip`);
console.log(
  `Initial JS: ${formatBytes(totalBytes)} gzip (budget ${formatBytes(INITIAL_JS_GZIP_BUDGET_BYTES)})`,
);
if (totalBytes > INITIAL_JS_GZIP_BUDGET_BYTES) {
  console.error(
    'Initial JS is over budget: split it, or raise the budget with a reason in PROGRESS.md.',
  );
  process.exitCode = 1;
}
