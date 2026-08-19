import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getDeputado: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getDeputado: mocks.getDeputado }));
import tool from "./get-deputy";

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
  iniciativas: [],
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
  });

  it("returns nulls rather than zeroes when the API sent no stats", async () => {
    // Zero authored is a claim; unknown is not.
    mocks.getDeputado.mockResolvedValue({ ...DEPUTY, stats: null });
    const result = await tool({ id: 4321 });
    expect(result.initiativesAuthored).toBeNull();
    expect(result.initiativesApproved).toBeNull();
  });
});
