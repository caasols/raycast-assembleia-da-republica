import { describe, it, expect } from "vitest";
import { hasMorePages, toApiPage } from "./pagination";

describe("toApiPage", () => {
  it("turns Raycast's first page into openAR's first page", () => {
    // Raycast counts from 0, openAR from 1. Passing 0 through would request
    // page 0, which openAR clamps back up to 1 — so the first two scrolls
    // would return identical rows and the list would look stuck.
    expect(toApiPage(0)).toBe(1);
  });

  it("keeps subsequent pages aligned", () => {
    expect(toApiPage(1)).toBe(2);
    expect(toApiPage(9)).toBe(10);
  });
});

describe("hasMorePages", () => {
  it("reports more when the pages so far do not cover the total", () => {
    expect(hasMorePages(1, 50, 120)).toBe(true);
    expect(hasMorePages(2, 50, 120)).toBe(true);
  });

  it("reports none once they do", () => {
    expect(hasMorePages(3, 50, 120)).toBe(false);
  });

  it("reports none when the last page is exactly full", () => {
    // The case a "did we get a full page?" heuristic gets wrong: it would
    // promise one more page, which comes back empty.
    expect(hasMorePages(2, 50, 100)).toBe(false);
  });

  it("reports none for an empty result set", () => {
    expect(hasMorePages(1, 50, 0)).toBe(false);
  });

  it("handles a total smaller than one page", () => {
    expect(hasMorePages(1, 50, 3)).toBe(false);
  });

  it("handles the 230 sitting deputies against the API's 200 maximum", () => {
    // The concrete case that motivated this: /deputados?situacao=ativo returns
    // 230 rows and `limit` caps at 200, so a single request cannot reach them
    // all however large the page.
    expect(hasMorePages(1, 200, 230)).toBe(true);
    expect(hasMorePages(2, 200, 230)).toBe(false);
  });
});
