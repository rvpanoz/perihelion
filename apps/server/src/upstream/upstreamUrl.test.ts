import { donkiCmeQuery } from '@perihelion/data';
import { describe, expect, it } from 'vitest';
import { redactedUrl, upstreamUrl } from './upstreamUrl.js';

const QUERY = donkiCmeQuery({ startDate: '2026-08-29', endDate: '2026-09-28' }, 'SECRET-KEY');

describe('upstreamUrl', () => {
  it('puts every query parameter on the base URL', () => {
    const url = upstreamUrl(QUERY);
    expect(url.origin + url.pathname).toBe('https://api.nasa.gov/DONKI/CME');
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
