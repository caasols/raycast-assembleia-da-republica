import { describe, it, expect } from "vitest";
import { petitionDetailMarkdown, signatureLabel } from "./petitions";
import type { Peticao } from "./types";

function petition(overrides: Partial<Peticao> = {}): Peticao {
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
    urlTexto: "https://example.pt/peticao.pdf",
    dataDebate: null,
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("signatureLabel", () => {
  it("groups thousands for readability", () => {
    expect(signatureLabel(petition())).toBe("8,421 signatures");
  });

  it("returns null when the count is unknown, rather than showing zero", () => {
    expect(signatureLabel(petition({ assinaturas: null }))).toBeNull();
  });

  it("shows a genuine zero as zero", () => {
    expect(signatureLabel(petition({ assinaturas: 0 }))).toBe("0 signatures");
  });
});

describe("petitionDetailMarkdown", () => {
  it("leads with the subject", () => {
    expect(petitionDetailMarkdown(petition())).toMatch(/^# Pela reabilitação da linha do Tua/);
  });

  it("falls back to a placeholder when the subject is missing", () => {
    expect(petitionDetailMarkdown(petition({ assunto: null }))).toMatch(/^# Untitled petition/);
  });

  it("pairs the number with the legislature", () => {
    expect(petitionDetailMarkdown(petition())).toContain("**12/XVII · XVII**");
  });

  it("omits the reference line entirely when neither half exists", () => {
    const markdown = petitionDetailMarkdown(petition({ numero: null, legislaturaId: "" }));
    expect(markdown).not.toContain("**·**");
  });

  it("lists author, signatures, status and dates", () => {
    const markdown = petitionDetailMarkdown(petition({ dataDebate: "2026-06-05" }));
    expect(markdown).toContain("**Author:** Associação de Moradores");
    expect(markdown).toContain("**Signatures:** 8,421");
    expect(markdown).toContain("**Status:** Admitida");
    expect(markdown).toContain("**Submitted:** 10 February 2026");
    expect(markdown).toContain("**Debated:** 5 June 2026");
  });

  it("omits facts the record does not carry", () => {
    const markdown = petitionDetailMarkdown(
      petition({ autor: null, assinaturas: null, situacao: null, dataEntrada: null }),
    );
    expect(markdown).not.toContain("**Author:**");
    expect(markdown).not.toContain("**Signatures:**");
    expect(markdown).not.toContain("**Status:**");
    expect(markdown).not.toContain("**Submitted:**");
  });

  it("says when no text is published, so a missing action reads as missing data", () => {
    expect(petitionDetailMarkdown(petition({ urlTexto: null }))).toContain("_No text is published for this petition._");
  });
});
