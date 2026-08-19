import { describe, it, expect } from "vitest";
import { authorName, authorsLine, initiativeFullMarkdown } from "./initiative-detail";
import type { Autor, IniciativaDetail } from "./types";

function initiative(overrides: Partial<IniciativaDetail> = {}): IniciativaDetail {
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
    linkTexto: null,
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

const author = (o: Partial<Autor> = {}): Autor => ({
  tipo: "deputado",
  deputadoId: 1,
  grupoParlamentar: "PS",
  nome: "Pedro Nuno Santos",
  ...o,
});

describe("authorName", () => {
  it("prefers the person's name", () => {
    expect(authorName(author())).toBe("Pedro Nuno Santos");
  });

  it("falls back to the group when there is no name", () => {
    // A group-authored bill carries a sigla and no name.
    expect(authorName(author({ nome: null, tipo: "grupo" }))).toBe("PS");
  });

  it("falls back to the author kind when there is neither", () => {
    expect(authorName(author({ nome: null, grupoParlamentar: null, tipo: "governo" }))).toBe("governo");
  });
});

describe("authorsLine", () => {
  it("joins authors", () => {
    expect(authorsLine([author(), author({ nome: "Maria Silva" })])).toBe("Pedro Nuno Santos, Maria Silva");
  });

  it("deduplicates, since a bill can list the same group twice", () => {
    expect(authorsLine([author({ nome: null, tipo: "grupo" }), author({ nome: null, tipo: "grupo" })])).toBe("PS");
  });

  it("returns an empty string for no authors", () => {
    expect(authorsLine([])).toBe("");
  });
});

describe("initiativeFullMarkdown", () => {
  it("leads with the title and reference", () => {
    const md = initiativeFullMarkdown(initiative());
    expect(md).toMatch(/^# Altera o Código do Trabalho/);
    expect(md).toContain("**Projeto de Lei 1/XVII** · XVII");
  });

  it("lists the authors when they were included", () => {
    expect(initiativeFullMarkdown(initiative({ autores: [author()] }))).toContain("**Authors:** Pedro Nuno Santos");
  });

  it("omits the authors line when the relation was not requested", () => {
    expect(initiativeFullMarkdown(initiative())).not.toContain("**Authors:**");
  });

  it("labels estado as a stage, never a result", () => {
    const md = initiativeFullMarkdown(initiative());
    expect(md).toContain("**Stage:** Lei (Publicação DR)");
    expect(md).not.toContain("Result:");
  });

  it("renders each stage with its date", () => {
    const md = initiativeFullMarkdown(
      initiative({ eventos: [{ id: 1, fase: "Votação na generalidade", dataFase: "2026-04-10", obs: null }] }),
    );
    expect(md).toContain("## Passage");
    expect(md).toContain("### Votação na generalidade — 10 April 2026");
  });

  it("renders a stage with no date", () => {
    const md = initiativeFullMarkdown(initiative({ eventos: [{ id: 1, fase: "Entrada", dataFase: null, obs: null }] }));
    expect(md).toContain("### Entrada");
    expect(md).not.toContain("Entrada —");
  });

  it("includes a stage's observation when there is one", () => {
    const md = initiativeFullMarkdown(
      initiative({ eventos: [{ id: 1, fase: "Baixa comissão", dataFase: null, obs: "Prorrogado" }] }),
    );
    expect(md).toContain("Prorrogado");
  });

  it("shows each vote's result and party breakdown", () => {
    const md = initiativeFullMarkdown(
      initiative({
        eventos: [
          {
            id: 1,
            fase: "Votação",
            dataFase: null,
            obs: null,
            votacoes: [
              {
                id: "v1",
                data: "2026-04-10",
                resultado: "Aprovado",
                unanime: false,
                reuniao: null,
                tipoReuniao: null,
                descricao: null,
                aFavor: ["PS"],
                contra: ["CH"],
                abstencao: [],
                ausencias: [],
                detalhe: null,
              },
            ],
          },
        ],
      }),
    );
    expect(md).toContain("- **Aprovado** — In favour: PS · Against: CH");
  });

  it("shows a vote with no recorded breakdown as just its result", () => {
    const md = initiativeFullMarkdown(
      initiative({
        eventos: [
          {
            id: 1,
            fase: "Votação",
            dataFase: null,
            obs: null,
            votacoes: [
              {
                id: "v1",
                data: null,
                resultado: "Aprovado",
                unanime: true,
                reuniao: null,
                tipoReuniao: null,
                descricao: null,
                aFavor: [],
                contra: [],
                abstencao: [],
                ausencias: [],
                detalhe: null,
              },
            ],
          },
        ],
      }),
    );
    expect(md).toContain("- **Aprovado (unanimous)**");
    expect(md).not.toContain("Aprovado (unanimous)} —");
  });

  it("lists publications with their page ranges", () => {
    const md = initiativeFullMarkdown(
      initiative({
        eventos: [
          {
            id: 1,
            fase: "Publicação",
            dataFase: null,
            obs: null,
            publicacoes: [{ data: null, tipo: "DAR II série A", paginas: ["92-95"], urlDiario: null }],
          },
        ],
      }),
    );
    expect(md).toContain("- DAR II série A, pp. 92-95");
  });

  it("handles a publication with no pages or type", () => {
    const md = initiativeFullMarkdown(
      initiative({
        eventos: [
          {
            id: 1,
            fase: "Publicação",
            dataFase: null,
            obs: null,
            publicacoes: [{ data: null, tipo: null, paginas: [], urlDiario: null }],
          },
        ],
      }),
    );
    expect(md).toContain("- Published");
  });

  it("says so when no stages are recorded, rather than showing an empty heading", () => {
    expect(initiativeFullMarkdown(initiative({ eventos: [] }))).toContain("_No stages have been recorded");
  });

  it("includes the epigraph and entry date when present", () => {
    const md = initiativeFullMarkdown(initiative({ epigrafe: "Décima alteração" }));
    expect(md).toContain("_Décima alteração_");
    expect(md).toContain("**Entered:** 4 March 2026");
  });

  it("omits facts the record does not carry", () => {
    const md = initiativeFullMarkdown(initiative({ estado: null, dataEntrada: null }));
    expect(md).not.toContain("**Stage:**");
    expect(md).not.toContain("**Entered:**");
  });
});
