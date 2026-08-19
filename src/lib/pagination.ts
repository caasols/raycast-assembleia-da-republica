/**
 * The arithmetic between Raycast's pagination and openAR's.
 *
 * They disagree about where pages start, and getting it wrong is silent: an
 * off-by-one either skips the first page of results or re-fetches it forever.
 * Both directions are a bug nobody would see in a stack trace, so the
 * conversion lives here with tests rather than inline in six commands.
 */

/**
 * Convert Raycast's zero-based page index to openAR's one-based `page`.
 *
 * `useCachedPromise` documents its `page` as "Zero-based"; openAR's `page` has
 * `minimum: 1`. Passing Raycast's index straight through would request page 0,
 * which openAR clamps up to 1 — so the first two scrolls would return the same
 * rows and the list would appear to stall.
 */
export function toApiPage(raycastPage: number): number {
  return raycastPage + 1;
}

/**
 * Whether another page exists, given the envelope openAR returned.
 *
 * Derived from `total` rather than from "did we get a full page", because a
 * final page that happens to be exactly `limit` long would otherwise promise
 * one more page that comes back empty.
 */
export function hasMorePages(apiPage: number, limit: number, total: number): boolean {
  return apiPage * limit < total;
}
