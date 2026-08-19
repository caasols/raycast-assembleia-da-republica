/**
 * A tiny in-memory store of `ETag` → last response body, for the two detail
 * endpoints openAR sends weak ETags on.
 *
 * In-memory rather than Raycast's `Cache`: a command's process is short-lived,
 * so this saves repeat fetches *within* a session — reopening the same
 * initiative while navigating — which is the case that actually happens. A
 * persistent cache would need eviction and staleness rules to buy the rarer
 * across-session case, and this API changes daily anyway.
 */
const entries = new Map<string, { etag: string; body: unknown }>();

/** The `If-None-Match` value to send for a URL, if we have seen it before. */
export function knownEtag(url: string): string | undefined {
  return entries.get(url)?.etag;
}

/** The body last seen for a URL — what a 304 means we should reuse. */
export function cachedBody(url: string): unknown {
  return entries.get(url)?.body;
}

/**
 * Remember a response.
 *
 * A response with no `ETag` is not stored: without one there is nothing to send
 * as `If-None-Match`, so a stored body could never be revalidated and would
 * only ever be served stale.
 */
export function remember(url: string, etag: string | null, body: unknown): void {
  if (etag) {
    entries.set(url, { etag, body });
  }
}

/** Test seam, and a way to drop everything if a command ever needs to. */
export function __clearEtagCache(): void {
  entries.clear();
}
