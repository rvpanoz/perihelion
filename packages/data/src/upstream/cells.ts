import { z } from 'zod';
import { UpstreamFormatError } from './upstreamFormatError';

/** SBDB and CAD send cells as strings; numbers are accepted too, since the docs do not promise it. */
const cellSchema = z.union([z.string(), z.number()]).nullable();
export type Cell = z.infer<typeof cellSchema>;

/**
 * The envelope SBDB Query and CAD share. Both omit `fields` and `data` when nothing matches.
 * `count` is coerced, so a string or a number both read; the recordings carry a number.
 * https://ssd-api.jpl.nasa.gov/doc/cad.html
 */
export const jplColumnarResponseSchema = z.object({
  signature: z.object({ version: z.string() }),
  count: z.coerce.number().int().nonnegative(),
  fields: z.array(z.string()).default([]),
  data: z.array(z.array(cellSchema)).default([]),
});
export type JplColumnarResponse = z.infer<typeof jplColumnarResponseSchema>;

/**
 * Keys each row by the field names the API echoed back, so a renamed or reordered column fails here
 * instead of shifting values into the wrong property.
 */
export function readColumnarRows<F extends string>(
  response: JplColumnarResponse,
  required: readonly F[],
): Record<F, Cell>[] {
  if (response.data.length === 0) {
    assertGenuinelyEmpty(response);
    return [];
  }
  const columns = required.map((field) => [field, columnIndex(response.fields, field)] as const);
  return response.data.map((row) => {
    if (row.length !== response.fields.length) {
      throw new UpstreamFormatError(`Expected ${response.fields.length} cells, got ${row.length}`);
    }
    // Every required field gets an entry, so the record is complete despite fromEntries' wider type.
    return Object.fromEntries(
      columns.map(([field, index]) => [field, row[index] ?? null]),
    ) as Record<F, Cell>;
  });
}

/**
 * Upstream drops `fields` and `data` when nothing matches, and reports `count: 0`. A positive `count`
 * with no rows means the keys were renamed or dropped, which must not read as an empty answer.
 * (`count` is not the row count in general: `limit` makes it larger than `data.length`.)
 */
function assertGenuinelyEmpty(response: JplColumnarResponse): void {
  if (response.count > 0) {
    throw new UpstreamFormatError(`Response reports ${response.count} matches but carries no rows`);
  }
}

function columnIndex(fields: readonly string[], field: string): number {
  const index = fields.indexOf(field);
  if (index === -1) throw new UpstreamFormatError(`Response has no "${field}" field`);
  return index;
}

/** Number('') and Number(null) are 0, so blank cells are treated as absent, never as zero. */
export function readFiniteOrNull(cell: Cell): number | null {
  if (readOptionalString(cell) === null) return null;
  const value = Number(cell);
  return Number.isFinite(value) ? value : null;
}

export function readNumber(cell: Cell, field: string): number {
  const value = readFiniteOrNull(cell);
  if (value === null)
    throw new UpstreamFormatError(`Field ${field} is not a number: ${JSON.stringify(cell)}`);
  return value;
}

export function readOptionalNumber(cell: Cell, field: string): number | null {
  return readOptionalString(cell) === null ? null : readNumber(cell, field);
}

export function readString(cell: Cell, field: string): string {
  const text = readOptionalString(cell);
  if (text === null) throw new UpstreamFormatError(`Field ${field} is empty`);
  return text;
}

/** CAD pads `fullname` with leading spaces; blank means absent. */
export function readOptionalString(cell: Cell): string | null {
  const text = cell === null ? '' : String(cell).trim();
  return text === '' ? null : text;
}
