/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
// A stub-only helper: the real @raycast/api has no such export, so it is
// imported from the stub directly rather than through the alias.
import { __resetCaches } from "../../test/raycast-api-stub";

const mocks = vi.hoisted(() => ({
  getMeta: vi.fn(),
  parliamentaryGroups: vi.fn((grupos: string[]) =>
    grupos.filter((g) => !["Governo", "PAR", "Madeira", "Açores", "Mesa"].includes(g)),
  ),
}));
vi.mock("../lib/openar-client", () => mocks);

import { useParties } from "./use-parties";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  // useCachedPromise keeps a module-level Cache; without this a value cached by
  // an earlier test satisfies the next one before its promise ever settles.
  __resetCaches();
  mocks.parliamentaryGroups.mockImplementation((grupos: string[]) =>
    grupos.filter((g) => !["Governo", "PAR", "Madeira", "Açores", "Mesa"].includes(g)),
  );
});

const GRUPOS = ["Governo", "PAR", "Madeira", "Açores", "Mesa", "PS", "PSD", "CH"];

describe("useParties", () => {
  it("keeps the institutional authors for endpoints that accept them", async () => {
    mocks.getMeta.mockResolvedValue({ legislaturas: [], grupos: GRUPOS, tipos: [], estados: [] });
    const { result } = renderHook(() => useParties("authors"));
    await waitFor(() => expect(result.current).toContain("PS"));
    // /iniciativas and /votacoes take Governo; dropping it would lose a filter
    // that works.
    expect(result.current).toContain("Governo");
  });

  it("drops them for /deputados, which 400s on them", async () => {
    mocks.getMeta.mockResolvedValue({ legislaturas: [], grupos: GRUPOS, tipos: [], estados: [] });
    const { result } = renderHook(() => useParties("members"));
    await waitFor(() => expect(result.current).toContain("PS"));
    expect(result.current).not.toContain("Governo");
    expect(result.current).not.toContain("Mesa");
  });

  it("returns an empty list while loading, rather than undefined", () => {
    mocks.getMeta.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useParties("authors"));
    // A dropdown mapping over undefined throws; an empty one simply has no items.
    expect(result.current).toEqual([]);
  });

  it("degrades to no filter when /meta fails, instead of taking the command down", async () => {
    mocks.getMeta.mockRejectedValue(new Error("meta unreachable"));
    const { result } = renderHook(() => useParties("authors"));
    await waitFor(() => expect(result.current).toEqual([]));
  });
});
