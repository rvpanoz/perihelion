import { describe, expect, it } from 'vitest';
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { HorizonsError, readHorizonsResultText } from './horizonsResponse';

describe('readHorizonsResultText', () => {
  it('returns the result text of a successful response', () => {
    expect(readHorizonsResultText(vectorsResponse)).toContain('$$SOE');
  });

  it('throws the Horizons error message', () => {
    expect(() => readHorizonsResultText({ error: 'bad COMMAND' })).toThrow(HorizonsError);
    expect(() => readHorizonsResultText({ error: 'bad COMMAND' })).toThrow('bad COMMAND');
  });

  it('throws on the HTTP 400 body Horizons sends for unrecognised parameters', () => {
    const body = { message: 'one or more query parameter was not recognized', code: '400' };
    expect(() => readHorizonsResultText(body)).toThrow('not recognized');
  });

  it('throws when there is no result at all', () => {
    expect(() => readHorizonsResultText({ signature: { version: '1.2' } })).toThrow(HorizonsError);
    expect(() => readHorizonsResultText('<html>')).toThrow();
  });
});
