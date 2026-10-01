import type { UpstreamQuery } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import { redactedUrl, upstreamUrl } from './upstreamUrl.js';

// No upstream we call takes a key in the URL any more; redaction stays so none ever gets printed.
const QUERY: UpstreamQuery = {
  baseUrl: 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME',
  params: { startDate: '2026-08-29', endDate: '2026-09-28', api_key: 'SECRET-KEY' },
};

describe('upstreamUrl', () => {
  it('puts every query parameter on the base URL', () => {
    const url = upstreamUrl(QUERY);
    expect(url.origin + url.pathname).toBe('https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME');
    expect(url.searchParams.get('startDate')).toBe('2026-08-29');
    expect(url.searchParams.get('api_key')).toBe('SECRET-KEY');
  });
});

describe('redactedUrl', () => {
  it('hides the API key and keeps everything else', () => {
    const printed = redactedUrl(upstreamUrl(QUERY));
    expect(printed).not.toContain('SECRET-KEY');
    expect(printed).toContain('api_key=REDACTED');
    expect(printed).toContain('endDate=2026-09-28');
  });

  it('leaves the original URL untouched', () => {
    const url = upstreamUrl(QUERY);
    redactedUrl(url);
    expect(url.searchParams.get('api_key')).toBe('SECRET-KEY');
  });
});
