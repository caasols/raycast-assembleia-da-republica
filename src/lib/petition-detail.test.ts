import { describe, it, expect } from "vitest";
import { petitionFullMarkdown } from "./petition-detail";
import type { PeticaoDetail } from "./types";

function petition(overrides: Partial<PeticaoDetail> = {}): PeticaoDetail {
  return {
    id: 1,
    legislaturaId: "XVII",
    numero: "12/XVII",
    assunto: "Pela reabilitação da linha do Tua",
    autor: "Associação de Moradores",
    dataEntrada: "2026-02-10",
    assinaturas: 8421,
    assinaturasInicial: 4,
    situacao: "Admitida",
    urlTexto: "https://example.pt/p.pdf",
    dataDebate: null,
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("petitionFullMarkdown", () => {
  it("keeps the summary the list already showed", () => {
    const md = petitionFullMarkdown(petition());
    expect(md).toMatch(/^# Pela reabilitação da linha do Tua/);
    expect(md).toContain("**Signatures:** 8,421");
  });

  it("lists the committees that handled it, with their status", () => {
    const md = petitionFullMarkdown(
      petition({ comissoes: [{ nome: "Comissão de Economia", situacao: "Em apreciação" }] }),
    );
    expect(md).toContain("## Committees");
    expect(md).toContain("- Comissão de Economia — Em apreciação");
  });

  it("names an unnamed committee rather than rendering a blank bullet", () => {
    expect(petitionFullMarkdown(petition({ comissoes: [{ nome: null, situacao: null }] }))).toContain(
      "- Unnamed committee",
    );
  });

  it("omits the committees section when there are none", () => {
    expect(petitionFullMarkdown(petition({ comissoes: [] }))).not.toContain("## Committees");
  });

  it("links documents that have a URL", () => {
    const md = petitionFullMarkdown(
      petition({ documentos: [{ nome: "Relatório final", url: "https://example.pt/r.pdf" }] }),
    );
    expect(md).toContain("- [Relatório final](https://example.pt/r.pdf)");
  });

  it("names a document with no link, since it still exists", () => {
    const md = petitionFullMarkdown(petition({ documentos: [{ nome: "Parecer", url: null }] }));
    expect(md).toContain("- Parecer");
  });

  it("drops a document with neither name nor link", () => {
    expect(petitionFullMarkdown(petition({ documentos: [{ nome: null, url: null }] }))).not.toContain("## Documents");
  });

  it("falls back to a generic label for a linked document with no name", () => {
    const md = petitionFullMarkdown(petition({ documentos: [{ nome: null, url: "https://example.pt/x.pdf" }] }));
    expect(md).toContain("- [Document](https://example.pt/x.pdf)");
  });
});
