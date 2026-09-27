import { HorizonsError } from './horizonsResponse';

export type HorizonsRow = Readonly<Record<string, string>>;

const TABLE_START = '$$SOE';
const TABLE_END = '$$EOE';
// Horizons prints the CSV header, then a line of asterisks, then $$SOE.
const HEADER_OFFSET_ABOVE_START = 2;
const SUMMARY_LINE_COUNT = 12;

/**
 * Reads the CSV table between $$SOE and $$EOE. Columns are keyed by Horizons' own header, so an
 * upstream column change fails loudly instead of shifting values into the wrong field.
 */
export function parseHorizonsTable(text: string): HorizonsRow[] {
  const lines = text.split('\n');
  const start = lines.indexOf(TABLE_START);
  const end = lines.indexOf(TABLE_END);
  if (start < HEADER_OFFSET_ABOVE_START || end < start) {
    throw new HorizonsError(`No ephemeris table in Horizons result:\n${summarize(text)}`);
  }
  const header = splitCsvLine(lines[start - HEADER_OFFSET_ABOVE_START] ?? '');
  return lines.slice(start + 1, end).map((line) => toRow(header, splitCsvLine(line)));
}

/** Horizons ends every CSV line with a comma; drop the empty field that leaves. */
function splitCsvLine(line: string): string[] {
  const fields = line.split(',').map((field) => field.trim());
  return fields.at(-1) === '' ? fields.slice(0, -1) : fields;
}

function toRow(header: readonly string[], fields: readonly string[]): HorizonsRow {
  if (fields.length !== header.length) {
    throw new HorizonsError(`Expected ${header.length} columns, got ${fields.length}`);
  }
  return Object.fromEntries(header.map((name, index) => [name, fields[index] ?? '']));
}

function summarize(text: string): string {
  return text.trim().split('\n').slice(0, SUMMARY_LINE_COUNT).join('\n');
}
