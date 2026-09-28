/** Upstream sent something we cannot trust; the server treats it like an outage and falls back. */
export class UpstreamFormatError extends Error {
  override name = 'UpstreamFormatError';
}
