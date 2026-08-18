/**
 * Query-string construction for the openAR API, with the limits the API
 * enforces applied before a request is ever sent.
 *
 * Kept separate from the client so the rules are unit-testable without a
 * network stub, and so a command can reason about a query it has not sent yet.
 */

/** `limit` is `minimum: 1, maximum: 200, default: 50` in the spec. */
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 200;
/** `page` is `minimum: 1, default: 1`. */
export const MIN_PAGE = 1;
/** `q` carries `maxLength: 100`; exceeding it is a 400. */
export const MAX_Q_LENGTH = 100;
/** The whole query string is capped at 500 characters; exceeding it is a 400. */
export const MAX_QUERY_STRING_LENGTH = 500;

export type QueryValue = string | number | boolean | undefined | null;

/**
 * Clamp an integer into a range, the way the API itself does.
 *
 * openAR adjusts out-of-range `page`/`limit` "ao limite mais próximo" rather
 * than rejecting them, so a bad value returns edge data instead of an error —
 * there is no failure to notice. Clamping here keeps the request we send and
 * the data we get back describing the same thing.
 */
export function clampInt(value: number, min: number, max: number): number {
  // Only NaN needs special handling: it survives every comparison, so it would
  // reach the URL as the string "NaN". The infinities need none — Math.trunc
  // leaves them infinite and the clamp below pulls each to its nearer bound,
  // which is what "out of range" should mean for them.
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function clampLimit(limit: number): number {
  return clampInt(limit, MIN_LIMIT, MAX_LIMIT);
}

/**
 * `page` has a documented minimum but no documented maximum. Rather than invent
 * one, the ceiling is Number.MAX_SAFE_INTEGER: clampPage exists to enforce the
 * floor and to reject NaN, not to second-guess how deep the data goes.
 */
const MAX_PAGE_SENTINEL = Number.MAX_SAFE_INTEGER;

export function clampPage(page: number): number {
  return clampInt(page, MIN_PAGE, MAX_PAGE_SENTINEL);
}

/** Truncate free-text search to the length the API accepts. */
export function truncateQ(q: string): string {
  return q.length > MAX_Q_LENGTH ? q.slice(0, MAX_Q_LENGTH) : q;
}

/**
 * Build a query string from a record, dropping empty values.
 *
 * `undefined`, `null` and `""` are omitted rather than sent blank: openAR
 * treats a present-but-empty parameter as a value in its own right for
 * `include`, so sending one by accident would change the response.
 *
 * Array values repeat the key (`?estado=A&estado=B`) — the `style: form,
 * explode: true` that `/iniciativas?estado=` documents. Comma-joining silently
 * matches nothing.
 */
export function buildQueryString(params: Record<string, QueryValue | QueryValue[]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null || item === "") {
        continue;
      }
      search.append(key, String(item));
    }
  }
  return search.toString();
}

/**
 * Whether a query string is within the API's 500-character cap.
 *
 * Callers check rather than this throwing, so a command can decide between
 * dropping a filter and telling the user, instead of the client picking for it.
 */
export function isQueryStringWithinLimit(queryString: string): boolean {
  return queryString.length <= MAX_QUERY_STRING_LENGTH;
}
