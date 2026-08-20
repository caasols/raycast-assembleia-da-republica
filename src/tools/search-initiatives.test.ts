import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listIniciativas: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listIniciativas: mocks.listIniciativas }));

import tool from "./search-initiatives";
import { initiative } from "../../test/fixtures";

beforeEach(() => vi.clearAllMocks());

const INITIATIVE = initiative();

describe("search-initiatives tool", () => {
  it("passes every filter through to the API", async () => {
    mocks.listIniciativas.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25 });
    await tool({ query: "trabalho", legislature: "XVII", group: "PS", outcome: "aprovado" });
    expect(mocks.listIniciativas).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "trabalho",
        legislatura: "XVII",
        grupo: "PS",
        resultado: "aprovado",
        sort: "desc",
        limit: 25,
      }),
    );
  });

  it("searches every legislature when none is given", async () => {
    mocks.listIniciativas.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25 });
    await tool({ query: "saúde" });
    expect(mocks.listIniciativas.mock.calls[0][0].legislatura).toBeUndefined();
  });

  it("calls the stage a stage, so the model cannot report a bill as passed", async () => {
    // openAR's `estado` is the phase of the last recorded event, not a verdict.
    mocks.listIniciativas.mockResolvedValue({ data: [INITIATIVE], total: 1, page: 1, limit: 25 });
    const result = await tool({});
    expect(result.initiatives[0]).toMatchObject({ stage: "Lei (Publicação DR)" });
    expect(result.initiatives[0]).not.toHaveProperty("result");
    expect(result.initiatives[0]).not.toHaveProperty("approved");
  });

  it("returns the id and full-text link, so a follow-up question can use them", async () => {
    mocks.listIniciativas.mockResolvedValue({ data: [INITIATIVE], total: 1, page: 1, limit: 25 });
    const result = await tool({});
    expect(result.initiatives[0]).toMatchObject({ id: 42, fullTextUrl: "https://example.pt/texto.pdf" });
    expect(result.total).toBe(1);
  });
});
