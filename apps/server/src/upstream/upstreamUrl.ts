import type { UpstreamQuery } from '@perihelion/data';

export function upstreamUrl(query: UpstreamQuery): URL {
  const url = new URL(query.baseUrl);
  for (const [name, value] of Object.entries(query.params)) url.searchParams.set(name, value);
  return url;
}

/** Every URL we print goes through here: DONKI's key rides in the query string (CLAUDE.md #6). */
export function redactedUrl(url: URL): string {
  const copy = new URL(url);
  if (copy.searchParams.has('api_key')) copy.searchParams.set('api_key', 'REDACTED');
  return copy.toString();
}
