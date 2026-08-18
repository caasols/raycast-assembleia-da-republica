import { describe, it, expect } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns an Error's message, without the class name or stack", () => {
    expect(errorMessage(new Error("openAR returned 429"))).toBe("openAR returned 429");
  });

  it("keeps the message of an Error subclass", () => {
    class OpenArError extends Error {}
    expect(errorMessage(new OpenArError("rate limited"))).toBe("rate limited");
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
