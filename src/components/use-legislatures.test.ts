/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  listLegislaturas: vi.fn(),
  currentLegislature: vi.fn(),
  getDefaultLegislatureScope: vi.fn(),
}));
vi.mock("../lib/openar-client", () => ({
  listLegislaturas: mocks.listLegislaturas,
  currentLegislature: mocks.currentLegislature,
}));
vi.mock("../lib/preferences", () => ({ getDefaultLegislatureScope: mocks.getDefaultLegislatureScope }));

import { ALL_LEGISLATURES, useLegislatures } from "./use-legislatures";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDefaultLegislatureScope.mockReturnValue("current");
  mocks.currentLegislature.mockImplementation((list: { id: string; dataFim: string | null }[]) =>
    list.find((l) => l.dataFim === null),
  );
});

const LIST = [
  { id: "XVI", nome: "XVI Legislatura", dataFim: "2025-06-02" },
  { id: "XVII", nome: "XVII Legislatura", dataFim: null },
];

describe("ALL_LEGISLATURES", () => {
  it("is the empty string, which buildQueryString drops from the request", () => {
    // The sentinel's value is load-bearing: commands turn it into an *absent*
    // `legislatura` parameter precisely because the query builder omits empty
    // strings. Anything else would be sent to the API as a legislature
    // literally named that. Pinned here because the commands now import the
    // constant rather than repeating "" — this is the one place its meaning
    // is enforced.
    expect(ALL_LEGISLATURES).toBe("");
  });
});

describe("useLegislatures", () => {
  it("starts on the sitting legislature when the preference says current", async () => {
    mocks.listLegislaturas.mockResolvedValue(LIST);
    const { result } = renderHook(() => useLegislatures());
    await waitFor(() => expect(result.current.initialId).toBe("XVII"));
    expect(result.current.legislatures).toHaveLength(2);
  });

  it("resolves current from the data rather than a stored id", async () => {
    // A stored "XVII" would silently show a closed legislature as live after
    // the next election; deriving it from dataFim === null cannot go stale.
    mocks.listLegislaturas.mockResolvedValue([
      { id: "XVII", nome: "XVII", dataFim: "2029-01-01" },
      { id: "XVIII", nome: "XVIII", dataFim: null },
    ]);
    const { result } = renderHook(() => useLegislatures());
    await waitFor(() => expect(result.current.initialId).toBe("XVIII"));
  });

  it("starts unfiltered when the preference says all", async () => {
    mocks.getDefaultLegislatureScope.mockReturnValue("all");
    mocks.listLegislaturas.mockResolvedValue(LIST);
    const { result } = renderHook(() => useLegislatures());
    await waitFor(() => expect(result.current.legislatures).toHaveLength(2));
    expect(result.current.initialId).toBe(ALL_LEGISLATURES);
  });

  it("is unfiltered while loading, rather than filtering by a guess", () => {
    mocks.listLegislaturas.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLegislatures());
    expect(result.current.initialId).toBe(ALL_LEGISLATURES);
    expect(result.current.legislatures).toEqual([]);
  });

  it("degrades to unfiltered when the request fails, instead of taking the list down", async () => {
    mocks.listLegislaturas.mockRejectedValue(new Error("unreachable"));
    const { result } = renderHook(() => useLegislatures());
    await waitFor(() => expect(result.current.legislatures).toEqual([]));
    expect(result.current.initialId).toBe(ALL_LEGISLATURES);
  });

  it("is unfiltered when no legislature is marked as sitting", async () => {
    mocks.listLegislaturas.mockResolvedValue([{ id: "XVI", nome: "XVI", dataFim: "2025-06-02" }]);
    const { result } = renderHook(() => useLegislatures());
    await waitFor(() => expect(result.current.legislatures).toHaveLength(1));
    expect(result.current.initialId).toBe(ALL_LEGISLATURES);
  });
});
