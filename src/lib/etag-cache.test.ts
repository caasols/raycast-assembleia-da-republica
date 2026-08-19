import { describe, it, expect, beforeEach } from "vitest";
import { __clearEtagCache, cachedBody, knownEtag, remember } from "./etag-cache";

beforeEach(__clearEtagCache);

describe("etag cache", () => {
  it("knows nothing about a URL it has not seen", () => {
    expect(knownEtag("https://x/1")).toBeUndefined();
    expect(cachedBody("https://x/1")).toBeUndefined();
  });

  it("remembers an etag and its body together", () => {
    remember("https://x/1", 'W/"abc"', { id: 1 });
    expect(knownEtag("https://x/1")).toBe('W/"abc"');
    expect(cachedBody("https://x/1")).toEqual({ id: 1 });
  });

  it("does not store a response that carried no etag", () => {
    // Without one there is nothing to send as If-None-Match, so the body could
    // never be revalidated and would only ever be served stale.
    remember("https://x/1", null, { id: 1 });
    expect(knownEtag("https://x/1")).toBeUndefined();
    expect(cachedBody("https://x/1")).toBeUndefined();
  });

  it("keeps URLs separate", () => {
    remember("https://x/1", 'W/"a"', { id: 1 });
    remember("https://x/2", 'W/"b"', { id: 2 });
    expect(cachedBody("https://x/2")).toEqual({ id: 2 });
  });

  it("replaces an entry when the resource changes", () => {
    remember("https://x/1", 'W/"a"', { id: 1, v: 1 });
    remember("https://x/1", 'W/"b"', { id: 1, v: 2 });
    expect(knownEtag("https://x/1")).toBe('W/"b"');
    expect(cachedBody("https://x/1")).toEqual({ id: 1, v: 2 });
  });

  it("clears everything", () => {
    remember("https://x/1", 'W/"a"', { id: 1 });
    __clearEtagCache();
    expect(knownEtag("https://x/1")).toBeUndefined();
  });
});
