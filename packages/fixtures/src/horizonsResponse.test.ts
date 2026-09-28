import { describe, expect, it } from 'vitest';
import vectorsResponse from './recorded/vectors-emb.json' with { type: 'json' };
import { HorizonsError, readHorizonsResponse } from './horizonsResponse';

describe('readHorizonsResponse', () => {
  it('returns the result text and API version of a successful response', () => {
    const response = readHorizonsResponse(vectorsResponse);
    expect(response.resultText).toContain('$$SOE');
    expect(response.apiVersion).toBe('1.2');
  });

  it('throws the Horizons error message', () => {
    expect(() => readHorizonsResponse({ error: 'bad COMMAND' })).toThrow(HorizonsError);
    expect(() => readHorizonsResponse({ error: 'bad COMMAND' })).toThrow('bad COMMAND');
  });

  it('throws on the HTTP 400 body Horizons sends for unrecognised parameters', () => {
    const body = { message: 'one or more query parameter was not recognized', code: '400' };
    expect(() => readHorizonsResponse(body)).toThrow('not recognized');
  });

  it('throws when there is no result at all', () => {
    expect(() => readHorizonsResponse({ signature: { version: '1.2' } })).toThrow(HorizonsError);
    expect(() => readHorizonsResponse('<html>')).toThrow();
  });

  it('throws when the API version signature is missing', () => {
    expect(() => readHorizonsResponse({ result: '$$SOE' })).toThrow(HorizonsError);
  });
});
