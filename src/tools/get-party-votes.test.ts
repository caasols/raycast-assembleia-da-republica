import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listVotacoes: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));

import tool from "./get-party-votes";
import { page, vote } from "../../test/fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listVotacoes.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25 });
});

describe("get-party-votes tool", () => {
  it("maps each position onto the API's own filter", async () => {
    // One request rather than fetching everything and filtering here, which the
    // 100 req/min budget would punish.
    await tool({ party: "PS" });
    // Newest votes first, and a bounded page — the answer is "recent votes",
    // not the archive.
    expect(mocks.listVotacoes.mock.calls[0][0]).toMatchObject({ aFavor: "PS", sort: "desc", limit: 25 });

    await tool({ party: "CH", position: "against" });
    expect(mocks.listVotacoes.mock.calls[1][0]).toMatchObject({ contra: "CH" });

    await tool({ party: "IL", position: "abstained" });
    expect(mocks.listVotacoes.mock.calls[2][0]).toMatchObject({ abstencao: "IL" });
  });

  it("defaults to votes in favour and says so in the result", async () => {
    expect(await tool({ party: "PS" })).toMatchObject({ party: "PS", position: "for" });
  });

  it("echoes the position back, so the model does not have to remember it", async () => {
    expect(await tool({ party: "CH", position: "against" })).toMatchObject({ position: "against" });
  });

  it("scopes to a legislature when given one", async () => {
    await tool({ party: "PS", legislature: "XV" });
    expect(mocks.listVotacoes.mock.calls[0][0].legislatura).toBe("XV");
  });

  it("returns the full breakdown, not just the party asked about", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ data: "2026-08-19" })], 1, 25));
    const result = await tool({ party: "PS" });
    expect(result.votes[0]).toMatchObject({ inFavour: ["PS", "PSD"], against: ["CH"], abstained: ["IL"] });
  });
  it("lets an API failure propagate, so the model cannot mistake silence for data", async () => {
    // D80: a tool that swallowed this would let the model answer confidently
    // about parliament from nothing — the worst outcome this extension has.
    mocks.listVotacoes.mockRejectedValue(new Error("openAR unreachable"));
    await expect(tool({ party: "PS" })).rejects.toThrow("openAR unreachable");
  });
});
