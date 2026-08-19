import { describe, it, expect } from "vitest";
import { initiativeDetailMarkdown, initiativeLabel } from "./initiatives";
import type { Iniciativa } from "./types";

function initiative(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
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
    linkTexto: "https://example.pt/texto.pdf",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("initiativeLabel", () => {
  it("uses the human-readable type, not the single-letter code", () => {
    expect(initiativeLabel(initiative())).toBe("Projeto de Lei 1/XVII");
  });

  it("drops an empty half rather than leaving a dangling space", () => {
    expect(initiativeLabel(initiative({ tipoDesc: "" }))).toBe("1/XVII");
    expect(initiativeLabel(initiative({ numero: "" }))).toBe("Projeto de Lei");
  });
});

describe("initiativeDetailMarkdown", () => {
  it("leads with the title", () => {
    expect(initiativeDetailMarkdown(initiative())).toMatch(/^# Altera o Código do Trabalho/);
  });

  it("pairs the reference with the legislature", () => {
    expect(initiativeDetailMarkdown(initiative())).toContain("**Projeto de Lei 1/XVII** · XVII");
  });

  it("labels `estado` as a stage, never as a result", () => {
    // The API is explicit that estado is the phase of the last event and not a
    // verdict; calling it a result in the UI invites the exact misreading the
    // documentation warns about.
    const markdown = initiativeDetailMarkdown(initiative());
    expect(markdown).toContain("**Stage:** Lei (Publicação DR)");
    expect(markdown).not.toContain("Result:");
  });

  it("formats the dates for reading", () => {
    const markdown = initiativeDetailMarkdown(initiative({ dataFim: "2026-07-30" }));
    expect(markdown).toContain("**Entered:** 4 March 2026");
    expect(markdown).toContain("**Concluded:** 30 July 2026");
  });

  it("omits facts the record does not carry", () => {
    const markdown = initiativeDetailMarkdown(initiative({ estado: null, dataEntrada: null, dataFim: null }));
    expect(markdown).not.toContain("**Stage:**");
    expect(markdown).not.toContain("**Entered:**");
    expect(markdown).not.toContain("**Concluded:**");
  });

  it("includes the epigraph when there is one", () => {
    expect(initiativeDetailMarkdown(initiative({ epigrafe: "Décima alteração" }))).toContain("_Décima alteração_");
  });

  it("says when no full text exists, so the missing action reads as missing data", () => {
    expect(initiativeDetailMarkdown(initiative({ linkTexto: null }))).toContain(
      "_No full text is published for this initiative._",
    );
  });

  it("stays quiet about the full text when there is one", () => {
    expect(initiativeDetailMarkdown(initiative())).not.toContain("No full text");
  });
});
