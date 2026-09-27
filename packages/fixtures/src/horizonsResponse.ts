import { z } from 'zod';

export class HorizonsError extends Error {
  override name = 'HorizonsError';
}

// `error` is Horizons' own failure field; `message` is the gateway's HTTP 400 body.
const envelopeSchema = z.object({
  result: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

/** Horizons reports some failures inside an otherwise normal body, so every body is checked. */
export function readHorizonsResultText(body: unknown): string {
  const envelope = envelopeSchema.parse(body);
  const failure = envelope.error ?? envelope.message;
  if (failure !== undefined) throw new HorizonsError(failure);
  if (envelope.result === undefined) throw new HorizonsError('Horizons response has no result');
  return envelope.result;
}
