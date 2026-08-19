import { describe, it, expect } from "vitest";
import {
  buildQueryString,
  clampInt,
  clampLimit,
  clampPage,
  isQueryStringWithinLimit,
  truncateQ,
  MAX_LIMIT,
  MAX_Q_LENGTH,
  MAX_QUERY_STRING_LENGTH,
  MIN_LIMIT,
  MIN_PAGE,
} from "./query";

describe("clampInt", () => {
  it("leaves an in-range value alone", () => {
    expect(clampInt(5, 1, 10)).toBe(5);
  });

  it("pulls values back to the nearest bound", () => {
    expect(clampInt(0, 1, 10)).toBe(1);
    expect(clampInt(99, 1, 10)).toBe(10);
  });

  it("truncates rather than rounds, so 1.9 cannot become an out-of-range 2", () => {
    expect(clampInt(1.9, 1, 10)).toBe(1);
  });

  it("falls back to the minimum for values that are not finite", () => {
    expect(clampInt(Number.NaN, 1, 10)).toBe(1);
    expect(clampInt(Number.POSITIVE_INFINITY, 1, 10)).toBe(10);
    expect(clampInt(Number.NEGATIVE_INFINITY, 1, 10)).toBe(1);
  });
});

describe("clampLimit", () => {
  it("holds the API's documented 1..200 range", () => {
    expect(clampLimit(0)).toBe(MIN_LIMIT);
    expect(clampLimit(50)).toBe(50);
    expect(clampLimit(5000)).toBe(MAX_LIMIT);
  });
});

describe("clampPage", () => {
  it("enforces the floor of 1", () => {
    expect(clampPage(0)).toBe(MIN_PAGE);
    expect(clampPage(-3)).toBe(MIN_PAGE);
  });

  it("does not invent a ceiling the API never documented", () => {
    expect(clampPage(10_000)).toBe(10_000);
  });

  it("rejects NaN rather than passing it into a URL", () => {
    expect(clampPage(Number.NaN)).toBe(MIN_PAGE);
  });
});

describe("truncateQ", () => {
  it("leaves a short query untouched", () => {
    expect(truncateQ("orçamento")).toBe("orçamento");
  });

  it("cuts at the API's 100-character maximum instead of earning a 400", () => {
    const long = "a".repeat(MAX_Q_LENGTH + 40);
    expect(truncateQ(long)).toHaveLength(MAX_Q_LENGTH);
  });

  it("keeps a query that is exactly at the maximum", () => {
    const exact = "b".repeat(MAX_Q_LENGTH);
    expect(truncateQ(exact)).toBe(exact);
  });
});

describe("buildQueryString", () => {
  it("serialises scalar values", () => {
    expect(buildQueryString({ legislatura: "XVII", page: 2 })).toBe("legislatura=XVII&page=2");
  });

  it("stringifies booleans, which the API only accepts as strings", () => {
    expect(buildQueryString({ unanime: true })).toBe("unanime=true");
  });

  it("drops undefined, null and empty string rather than sending them blank", () => {
    // An empty value is meaningful to openAR (`?include=` returns scalars
    // only), so a blank must never be sent by accident.
    expect(buildQueryString({ a: undefined, b: null, c: "", d: "kept" })).toBe("d=kept");
  });

  it("repeats the key for array values, as `explode: true` requires", () => {
    const qs = buildQueryString({ estado: ["Lei (Publicação DR)", "Iniciativa Caducada"] });
    expect(qs).toBe("estado=Lei+%28Publica%C3%A7%C3%A3o+DR%29&estado=Iniciativa+Caducada");
    // The decisive property: two separate values, not one comma-joined string.
    expect(new URLSearchParams(qs).getAll("estado")).toHaveLength(2);
  });

  it("skips empty entries inside an array", () => {
    expect(buildQueryString({ estado: ["A", undefined, "", "B"] })).toBe("estado=A&estado=B");
  });

  it("returns an empty string when nothing survives", () => {
    expect(buildQueryString({ a: undefined })).toBe("");
  });

  it("percent-encodes accented values so they survive the round trip", () => {
    expect(new URLSearchParams(buildQueryString({ q: "educação" })).get("q")).toBe("educação");
  });
});

describe("isQueryStringWithinLimit", () => {
  it("accepts a query at exactly the maximum", () => {
    expect(isQueryStringWithinLimit("x".repeat(MAX_QUERY_STRING_LENGTH))).toBe(true);
  });

  it("rejects one character beyond it", () => {
    expect(isQueryStringWithinLimit("x".repeat(MAX_QUERY_STRING_LENGTH + 1))).toBe(false);
  });
});
