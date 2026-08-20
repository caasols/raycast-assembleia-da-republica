import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getDeputado: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getDeputado: mocks.getDeputado }));
import tool from "./get-deputy";
import { initiative } from "../../test/fixtures";

beforeEach(() => vi.clearAllMocks());

const DEPUTY = {
  id: 4321,
  depId: 99,
  nomeParlamentar: "Pedro Nuno Santos",
  nomeCompleto: "Pedro Nuno de Oliveira Santos",
  grupoParlamentar: "PS",
  circuloEleitoral: "Lisboa",
  legislaturaId: "XVII",
  situacao: "Efetivo",
  updatedAt: "2026-08-01T00:00:00Z",
  dataNascimento: null,
  sexo: null,
  profissao: "Economista",
  mandatos: [
    {
      id: 1,
      legislaturaId: "XVII",
      grupoParlamentar: "PS",
      circuloEleitoral: "Lisboa",
      dataInicio: null,
      dataFim: null,
      situacao: "Efetivo",
    },
  ],
  bio: null,
  stats: { total: 40, aprovadas: 12, por_tipo: null },
  // Non-empty on purpose: with an empty list the recentInitiatives mapping was
  // the one line in the suite mutation testing found completely uncovered.
  iniciativas: [initiative({ id: 9, titulo: "Uma lei", numero: "9/XVII" })],
};

describe("get-deputy tool", () => {
  it("fetches the deputy by id", async () => {
    mocks.getDeputado.mockResolvedValue(DEPUTY);
    await tool({ id: 4321 });
    expect(mocks.getDeputado).toHaveBeenCalledWith(4321);
  });

  it("returns the authored-versus-approved pair, which says something about a record", async () => {
    mocks.getDeputado.mockResolvedValue(DEPUTY);
    const result = await tool({ id: 4321 });
    expect(result).toMatchObject({ initiativesAuthored: 40, initiativesApproved: 12 });
    expect(result.mandates).toEqual(["XVII · PS · Lisboa (Efetivo)"]);
    expect(result.recentInitiatives).toEqual([{ id: 9, title: "Uma lei", entered: "2026-03-04" }]);
  });

  it("returns nulls rather than zeroes when the API sent no stats", async () => {
    // Zero authored is a claim; unknown is not.
    mocks.getDeputado.mockResolvedValue({ ...DEPUTY, stats: null });
    const result = await tool({ id: 4321 });
    expect(result.initiativesAuthored).toBeNull();
    expect(result.initiativesApproved).toBeNull();
  });
  it("lets an API failure propagate, so the model cannot mistake silence for data", async () => {
    // D80: a tool that swallowed this would let the model answer confidently
    // about parliament from nothing — the worst outcome this extension has.
    mocks.getDeputado.mockRejectedValue(new Error("openAR unreachable"));
    await expect(tool({ id: 4321 })).rejects.toThrow("openAR unreachable");
  });
});
