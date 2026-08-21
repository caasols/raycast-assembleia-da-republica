import { describe, it, expect } from "vitest";
import { errorMessage, OpenArError, parseRetryAfterSeconds } from "./errors";

describe("errorMessage", () => {
  it("returns an Error's message, without the class name or stack", () => {
    expect(errorMessage(new Error("openAR returned 429"))).toBe("openAR returned 429");
  });

  it("keeps the message of an Error subclass", () => {
    expect(errorMessage(new OpenArError("rate limited", 429))).toBe("rate limited");
  });

  it("passes a thrown string straight through", () => {
    expect(errorMessage("network unreachable")).toBe("network unreachable");
  });

  it("stringifies a thrown non-Error value rather than dropping it", () => {
    expect(errorMessage(429)).toBe("429");
    expect(errorMessage(null)).toBe("null");
    expect(errorMessage(undefined)).toBe("undefined");
  });

  it("uses a thrown object's own toString when it has one", () => {
    expect(errorMessage({ toString: () => "custom reason" })).toBe("custom reason");
  });
});

describe("OpenArError", () => {
  it("carries the status so callers can tell retryable from permanent", () => {
    const error = new OpenArError("Not Found", 404);
    expect(error.status).toBe(404);
    expect(error.name).toBe("OpenArError");
    expect(error).toBeInstanceOf(Error);
  });

  it("is rate limited only on 429", () => {
    expect(new OpenArError("slow down", 429).isRateLimited).toBe(true);
    expect(new OpenArError("bad request", 400).isRateLimited).toBe(false);
  });

  it("carries Retry-After when one was given, and undefined when not", () => {
    expect(new OpenArError("slow down", 429, 60).retryAfterSeconds).toBe(60);
    expect(new OpenArError("slow down", 429).retryAfterSeconds).toBeUndefined();
  });
});

describe("parseRetryAfterSeconds", () => {
  it("reads the delta-seconds form openAR documents", () => {
    expect(parseRetryAfterSeconds("60")).toBe(60);
    expect(parseRetryAfterSeconds("  30 ")).toBe(30);
    expect(parseRetryAfterSeconds("0")).toBe(0);
  });

  it("returns undefined for a missing header", () => {
    expect(parseRetryAfterSeconds(null)).toBeUndefined();
  });

  it("returns undefined for the HTTP-date form rather than guessing a delay", () => {
    // Legal HTTP, but openAR does not send it; an unparsed header must not
    // become a plausible-looking wrong number.
    expect(parseRetryAfterSeconds("Wed, 21 Oct 2026 07:28:00 GMT")).toBeUndefined();
  });

  it("rejects values that are not non-negative integers", () => {
    expect(parseRetryAfterSeconds("-5")).toBeUndefined();
    expect(parseRetryAfterSeconds("1.5")).toBeUndefined();
    expect(parseRetryAfterSeconds("")).toBeUndefined();
    expect(parseRetryAfterSeconds("soon")).toBeUndefined();
  });

  it("treats a whitespace-only header as absent, not as zero", () => {
    // Without the trim, Number("   ") is 0 — "retry immediately", the opposite
    // of "we were not told". Mutation testing showed the trim could be dropped
    // with no test noticing.
    expect(parseRetryAfterSeconds("   ")).toBeUndefined();
  });
});
