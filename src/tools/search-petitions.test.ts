import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listPeticoes: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listPeticoes: mocks.listPeticoes }));
import tool from "./search-petitions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listPeticoes.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25 });
});

describe("search-petitions tool", () => {
  it("passes query, legislature and status through", async () => {
    await tool({ query: "tua", legislature: "XVII", status: "Admitida" });
    expect(mocks.listPeticoes).toHaveBeenCalledWith(
      expect.objectContaining({ q: "tua", legislatura: "XVII", situacao: "Admitida" }),
    );
  });

  it("returns the signature count, the consequential fact about a petition", async () => {
    mocks.listPeticoes.mockResolvedValue({
      data: [
        {
          id: 1,
          legislaturaId: "XVII",
          numero: "12/XVII",
          assunto: "Linha do Tua",
          autor: "Associação",
          dataEntrada: "2026-02-10",
          assinaturas: 8421,
          assinaturasInicial: 4,
          situacao: "Admitida",
          urlTexto: null,
          dataDebate: null,
          updatedAt: "2026-08-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    });
    const result = await tool({});
    expect(result.petitions[0]).toMatchObject({ id: 1, subject: "Linha do Tua", signatures: 8421 });
  });
});
