import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listVotacoes: vi.fn(), todayInLisbon: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));
vi.mock("../lib/dates", () => ({ todayInLisbon: mocks.todayInLisbon }));

import tool from "./get-recent-votes";
import { page, vote } from "../../test/fixtures";

const SITTING = "2026-10-28";
const VOTE = vote({ data: SITTING });

/** The newest vote answers the first request; the sitting day's votes the second. */
function archive(newest: ReturnType<typeof vote>[], day: ReturnType<typeof vote>[], dayTotal = day.length) {
  mocks.listVotacoes.mockResolvedValueOnce(page(newest)).mockResolvedValueOnce({ ...page(day), total: dayTotal });
}

beforeEach(() => {
  // reset, not clear: clear keeps queued mockResolvedValueOnce values, which
  // would leak one test's second response into the next.
  vi.resetAllMocks();
  mocks.todayInLisbon.mockReturnValue("2026-11-02");
});

describe("get-recent-votes tool", () => {
  it("finds the most recent sitting day from the newest vote in the archive", async () => {
    archive([VOTE], [VOTE]);
    await tool();
    // Parliament sits on about 54 days a year, so asking for today alone was
    // empty on most of them (D116). The newest vote says when it last sat.
    expect(mocks.listVotacoes.mock.calls[0][0]).toEqual({ sort: "desc", limit: 1 });
  });

  it("then fetches every vote of that day", async () => {
    archive([VOTE], [VOTE]);
    await tool();
    expect(mocks.listVotacoes.mock.calls[1][0]).toEqual({ dataInicio: SITTING, dataFim: SITTING, limit: 200 });
  });

  it("returns the sitting day and today, so the model can tell them apart", async () => {
    archive([VOTE], [VOTE]);
    const result = await tool();
    // Today is Lisbon's date (D39). Returning both lets the model say "nothing
    // today; on 28 October parliament voted on..." without being told how.
    expect(result).toMatchObject({ today: "2026-11-02", date: SITTING, count: 1 });
  });

  it("returns structured data for the model to phrase, not prose", async () => {
    archive([VOTE], [VOTE]);
    const result = await tool();
    expect(result.votes[0]).toEqual({
      initiative: "Orçamento do Estado para 2027",
      reference: "P 1/XVII",
      result: "Aprovado",
      breakdown: "In favour: PS, PSD · Against: CH · Abstained: IL",
    });
  });

  it("reports the day's true total even past one page, so a partial list is visible", async () => {
    archive([VOTE], [VOTE], 250);
    expect(await tool()).toMatchObject({ count: 250 });
  });

  it("fails rather than guessing when the newest vote carries no date", async () => {
    // Reporting zero votes here would be a confident wrong answer (D80).
    mocks.listVotacoes.mockResolvedValueOnce(page([vote({ data: null })]));
    await expect(tool()).rejects.toThrow("most recent sitting day");
    expect(mocks.listVotacoes).toHaveBeenCalledTimes(1);
  });

  it("fails rather than guessing when the archive returns nothing", async () => {
    mocks.listVotacoes.mockResolvedValueOnce(page([]));
    await expect(tool()).rejects.toThrow("most recent sitting day");
  });

  it("lets an API failure propagate, so the model does not report silence as no votes", async () => {
    mocks.listVotacoes.mockRejectedValue(new Error("openAR unreachable"));
    await expect(tool()).rejects.toThrow("openAR unreachable");
  });
});
