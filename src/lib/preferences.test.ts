import { describe, it, expect, beforeEach, vi } from "vitest";
// A stub-only surface: `getPreferenceValues` is a vi.fn in the @raycast/api
// stand-in, so tests drive it the same way they drive showToast.
import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_PAGE_SIZE, getPageSize } from "./preferences";
import { MAX_LIMIT, MIN_LIMIT } from "./query";

const mockPreferences = getPreferenceValues as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => mockPreferences.mockReset());

describe("getPageSize", () => {
  it("returns the chosen size as a number, since a dropdown yields strings", () => {
    mockPreferences.mockReturnValue({ pageSize: "25" });
    expect(getPageSize()).toBe(25);
  });

  it("honours every value the manifest offers", () => {
    for (const value of ["25", "50", "100", "200"]) {
      mockPreferences.mockReturnValue({ pageSize: value });
      expect(getPageSize()).toBe(Number(value));
    }
  });

  it("falls back to openAR's own default when the preference is missing", () => {
    mockPreferences.mockReturnValue({});
    expect(getPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  it("falls back when the value is not a number at all", () => {
    mockPreferences.mockReturnValue({ pageSize: "lots" });
    expect(getPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  it("clamps a hand-edited value above the API's maximum", () => {
    // Raycast stores preferences outside the extension, so a file edited by
    // hand could otherwise turn every list into a 400.
    mockPreferences.mockReturnValue({ pageSize: "5000" });
    expect(getPageSize()).toBe(MAX_LIMIT);
  });

  it("clamps a hand-edited value below the minimum", () => {
    mockPreferences.mockReturnValue({ pageSize: "0" });
    expect(getPageSize()).toBe(MIN_LIMIT);
  });
});
