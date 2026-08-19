import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listVotacoes: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));

import tool from "./get-party-votes";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listVotacoes.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25 });
});

describe("get-party-votes tool", () => {
  it("maps each position onto the API's own filter", async () => {
    // One request rather than fetching everything and filtering here, which the
    // 100 req/min budget would punish.
    await tool({ party: "PS" });
    expect(mocks.listVotacoes.mock.calls[0][0]).toMatchObject({ aFavor: "PS" });

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
    mocks.listVotacoes.mockResolvedValue({
      data: [
        {
          id: "v1",
          data: "2026-08-19",
          resultado: "Aprovado",
          unanime: false,
          reuniao: null,
          tipoReuniao: null,
          descricao: null,
          aFavor: ["PS"],
          contra: ["CH"],
          abstencao: ["IL"],
          ausencias: [],
          detalhe: null,
          iniciativaId: 1,
          iniciativaTitulo: "Uma lei",
          iniciativaNumero: "1/XVII",
          iniciativaTipo: "J",
          legislaturaId: "XVII",
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    });
    const result = await tool({ party: "PS" });
    expect(result.votes[0]).toMatchObject({ inFavour: ["PS"], against: ["CH"], abstained: ["IL"] });
  });
});
