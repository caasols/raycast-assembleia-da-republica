import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listDeputados: vi.fn(), listLegislaturas: vi.fn() }));
vi.mock("../lib/openar-client", async (importActual) => ({
  // The real resolver, so "current" means the same thing here as in the commands.
  currentLegislature: (await importActual<typeof import("../lib/openar-client")>()).currentLegislature,
  listDeputados: mocks.listDeputados,
  listLegislaturas: mocks.listLegislaturas,
}));

import tool from "./search-deputies";
import { deputy, page } from "../../test/fixtures";
import type { Legislatura } from "../lib/types";

const legislature = (id: string, dataFim: string | null): Legislatura => ({
  id,
  nome: `${id} Legislatura`,
  dataInicio: "2025-06-03",
  dataFim,
  arId: null,
  siglaAntiga: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listDeputados.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
  mocks.listLegislaturas.mockResolvedValue([legislature("XVI", "2025-06-02"), legislature("XVII", null)]);
});

describe("search-deputies tool", () => {
  it("defaults to the sitting deputies when no legislature is given", async () => {
    await tool({ name: "Pedro" });
    // `situacao=ativo` alone matches every seat ever held (2,306 rows on
    // 2026-11-02, Jerónimo de Sousa from XIV among them). Only together with
    // the current legislature does it select the 230 sitting deputies.
    expect(mocks.listDeputados.mock.calls[0][0]).toMatchObject({
      q: "Pedro",
      legislatura: "XVII",
      situacao: "ativo",
      sort: "asc",
      limit: 50,
    });
  });

  it("fails rather than guessing when openAR lists no legislature in progress", async () => {
    // Falling back to `situacao=ativo` alone would return former deputies as
    // sitting ones: a confident wrong answer, which D80 rules out.
    mocks.listLegislaturas.mockResolvedValue([legislature("XVI", "2025-06-02")]);
    await expect(tool({ name: "Pedro" })).rejects.toThrow("no legislature in progress");
    expect(mocks.listDeputados).not.toHaveBeenCalled();
  });

  it("drops the sitting filter when asked about a past legislature", async () => {
    await tool({ legislature: "X" });
    expect(mocks.listDeputados.mock.calls[0][0]).toMatchObject({ legislatura: "X", situacao: undefined });
    expect(mocks.listLegislaturas).not.toHaveBeenCalled();
  });

  it("passes a party filter through", async () => {
    await tool({ party: "PS" });
    expect(mocks.listDeputados.mock.calls[0][0].grupo).toBe("PS");
  });

  it("returns identity and affiliation for each deputy", async () => {
    mocks.listDeputados.mockResolvedValue(page([deputy()]));
    const result = await tool({});
    expect(result.deputies[0]).toEqual({
      id: 4321,
      name: "Pedro Nuno Santos",
      fullName: "Pedro Nuno de Oliveira Santos",
      party: "PS",
      constituency: "Lisboa",
      legislature: "XVII",
    });
  });
  it("lets an API failure propagate, so the model cannot mistake silence for data", async () => {
    // D80: a tool that swallowed this would let the model answer confidently
    // about parliament from nothing — the worst outcome this extension has.
    mocks.listDeputados.mockRejectedValue(new Error("openAR unreachable"));
    await expect(tool({ name: "x" })).rejects.toThrow("openAR unreachable");
  });
});
