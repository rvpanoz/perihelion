/** Upstream failed and there is no cached or snapshot copy to fall back to (HTTP 503). */
export class DatasetUnavailableError extends Error {
  override name = 'DatasetUnavailableError';
}

/** The caller's query string is invalid (HTTP 400). */
export class InvalidQueryError extends Error {
  override name = 'InvalidQueryError';
}
