/**
 * The one way this extension turns a caught `unknown` into text for a toast or
 * an error view, plus the typed error the openAR client raises.
 */

/**
 * A non-2xx response from openAR.
 *
 * Carries the status so a caller can distinguish the cases that mean different
 * things to a user: 429 is "wait and it will work", 404 is "this does not
 * exist", 400 is "the request was wrong and retrying will not help".
 */
export class OpenArError extends Error {
  readonly status: number;
  /**
   * Seconds to wait, from the `Retry-After` header on a 429. `undefined` when
   * the header is absent or unparseable — deliberately not defaulted to a
   * guess, so a caller can tell "the API told us to wait 60s" from "we do not
   * know", rather than inventing a delay the API never asked for.
   */
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "OpenArError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** Whether waiting and repeating the same request could succeed. */
  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/**
 * A rejection is not guaranteed to be an Error: `fetch`, the openAR client and
 * third-party code can all reject with a plain string or an object, and those
 * still have to read as something rather than "[object Object]" appearing with
 * no explanation, or the reason being dropped entirely.
 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Parse a `Retry-After` header value expressed in seconds.
 *
 * openAR documents `Retry-After: 60`, the delta-seconds form. The HTTP-date
 * form is legal in the spec but openAR does not send it, so it is treated as
 * unknown rather than guessed at — an unparsed header must not become a
 * plausible-looking wrong number.
 */
export function parseRetryAfterSeconds(header: string | null): number | undefined {
  if (header === null) {
    return undefined;
  }
  const trimmed = header.trim();
  // Number("") is 0, so an empty header would otherwise parse as "retry
  // immediately" rather than "we were not told" — the opposite of safe.
  if (trimmed === "") {
    return undefined;
  }
  const seconds = Number(trimmed);
  return Number.isInteger(seconds) && seconds >= 0 ? seconds : undefined;
}
