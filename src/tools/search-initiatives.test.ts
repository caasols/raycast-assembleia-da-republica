import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Iniciativa } from "../lib/types";

const mocks = vi.hoisted(() => ({ listIniciativas: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listIniciativas: mocks.listIniciativas }));

import tool from "./search-initiatives";

beforeEach(() => vi.clearAllMocks());

const INITIATIVE: Iniciativa = {
  id: 42,
  legislaturaId: "XVII",
  numero: "1/XVII",
  tipo: "J",
  tipoDesc: "Projeto de Lei",
  titulo: "Altera o Código do Trabalho",
  epigrafe: null,
  dataEntrada: "2026-03-04",
  dataFim: null,
  estado: "Lei (Publicação DR)",
  linkTexto: "https://example.pt/t.pdf",
  updatedAt: "2026-08-01T00:00:00Z",
};

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
    expect(result.initiatives[0]).toMatchObject({ id: 42, fullTextUrl: "https://example.pt/t.pdf" });
    expect(result.total).toBe(1);
  });
});
