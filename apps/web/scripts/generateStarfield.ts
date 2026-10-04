import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type StarRow, packStars } from '../src/scene/stars/starPacking';

/**
 * Writes the bundled starfield from the Yale Bright Star Catalogue (`bsc5p`) served by NASA HEASARC's TAP endpoint.
 * Network, dev only, like `npm run fixtures`: run it by hand and commit the result.
 *
 * HEASARC gives `ra`/`dec` in J2000 degrees and `vmag` as the visual magnitude (its metadata calls the column
 * "Photographic Magnitude", but Sirius reads −1.46, which is visual). `FORMAT=csv` is rejected; `text` works.
 * The other mirrors are unusable from here: CDS/VizieR sits behind an anti-bot wall and Harvard's tdc-www serves a
 * certificate for another hostname.
 */
const TAP_URL = 'https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync';

/** The naked-eye sky: 8,404 of the catalogue's 9,110 stars. Fainter ones would not survive the magnitude curve. */
const QUERY = 'SELECT hr, ra, dec, vmag, bv_color FROM bsc5p WHERE vmag <= 6.5 ORDER BY hr';

const OUTPUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '../public/stars/bsc5p-v1.bin');

/** Upstream is untrusted: a catalogue this much smaller means the query or the service changed, not the sky. */
const MINIMUM_STARS = 8000;

/** Sirius, HR 2491, as a check that the columns still mean what we think they mean. */
const SIRIUS = { hr: '2491', raDeg: 101.2871, decDeg: -16.7161, vmag: -1.46 };

async function fetchCatalogText(): Promise<string> {
  const url = new URL(TAP_URL);
  url.search = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'text',
    QUERY,
  }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HEASARC answered ${response.status} ${response.statusText}`);
  return response.text();
}

/** The text format is pipe-separated columns, padded with spaces, ending at the first blank line. */
function parseRows(text: string): Map<string, StarRow> {
  const lines = text.split('\n');
  const columns = (lines[0] ?? '').split('|').map((name) => name.trim());
  const rows = new Map<string, StarRow>();
  for (const line of lines.slice(1)) {
    if (line.trim() === '') break;
    const cells = new Map(
      line.split('|').map((cell, index) => [columns[index] ?? '', cell.trim()]),
    );
    rows.set(cells.get('hr') ?? '', {
      raDeg: Number(cells.get('ra')),
      decDeg: Number(cells.get('dec')),
      vmag: Number(cells.get('vmag')),
      // An unmeasured colour index draws the star white rather than dropping it.
      bvColor: Number(cells.get('bv_color')) || 0,
    });
  }
  return rows;
}

function checkCatalog(rows: Map<string, StarRow>): void {
  if (rows.size < MINIMUM_STARS) {
    throw new Error(
      `HEASARC returned ${rows.size} stars, fewer than the ${MINIMUM_STARS} expected`,
    );
  }
  const sirius = rows.get(SIRIUS.hr);
  const matches =
    sirius?.raDeg === SIRIUS.raDeg &&
    sirius.decDeg === SIRIUS.decDeg &&
    sirius.vmag === SIRIUS.vmag;
  if (!matches) throw new Error(`HR ${SIRIUS.hr} reads ${JSON.stringify(sirius)}, not Sirius`);
}

const rows = parseRows(await fetchCatalogText());
checkCatalog(rows);
const packed = packStars([...rows.values()]);
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, packed);
console.info(`Wrote ${rows.size} stars, ${packed.byteLength} bytes, to ${OUTPUT_PATH}`);
