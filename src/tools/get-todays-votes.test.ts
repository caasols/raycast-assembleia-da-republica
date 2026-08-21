import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listVotacoes: vi.fn(), todayInLisbon: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));
vi.mock("../lib/dates", () => ({ todayInLisbon: mocks.todayInLisbon }));

import tool from "./get-todays-votes";
import { vote } from "../../test/fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.todayInLisbon.mockReturnValue("2026-08-19");
});

const VOTE = vote({ data: "2026-08-19" });

describe("get-todays-votes tool", () => {
  it("asks for exactly today, in Lisbon", async () => {
    mocks.listVotacoes.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });
    await tool();
    // Parliament sits in Lisbon, so "today" is today there, not on the machine
    // asking the question.
    expect(mocks.listVotacoes).toHaveBeenCalledWith(
      expect.objectContaining({ dataInicio: "2026-08-19", dataFim: "2026-08-19" }),
    );
  });

  it("returns structured data for the model to phrase, not prose", async () => {
    mocks.listVotacoes.mockResolvedValue({ data: [VOTE], total: 1, page: 1, limit: 200 });
    const result = await tool();
    expect(result).toMatchObject({ date: "2026-08-19", count: 1 });
    expect(result.votes[0]).toEqual({
      initiative: "Orçamento do Estado para 2027",
      reference: "P 1/XVII",
      result: "Aprovado",
      breakdown: "In favour: PS, PSD · Against: CH · Abstained: IL",
    });
  });

  it("reports a quiet day as zero rather than failing", async () => {
    mocks.listVotacoes.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });
    expect(await tool()).toMatchObject({ count: 0, votes: [] });
  });

  it("lets an API failure propagate, so the model does not report silence as no votes", async () => {
    mocks.listVotacoes.mockRejectedValue(new Error("openAR unreachable"));
    await expect(tool()).rejects.toThrow("openAR unreachable");
  });
});
