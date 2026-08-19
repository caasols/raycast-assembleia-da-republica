import { describe, it, expect } from "vitest";
import { deputyFullMarkdown, mandateLine } from "./deputy-detail";
import type { DeputadoDetail, Mandato } from "./types";

const mandate = (o: Partial<Mandato> = {}): Mandato => ({
  id: 1,
  legislaturaId: "XVII",
  grupoParlamentar: "PS",
  circuloEleitoral: "Lisboa",
  dataInicio: "2025-06-03",
  dataFim: null,
  situacao: "Efetivo",
  ...o,
});

function deputy(overrides: Partial<DeputadoDetail> = {}): DeputadoDetail {
  return {
    id: 4321,
    depId: 99,
    nomeParlamentar: "Pedro Nuno Santos",
    nomeCompleto: "Pedro Nuno de Oliveira Santos",
    grupoParlamentar: "PS",
    circuloEleitoral: "Lisboa",
    legislaturaId: "XVII",
    situacao: "Efetivo",
    updatedAt: "2026-08-01T00:00:00Z",
    dataNascimento: "1977-01-01",
    sexo: "M",
    profissao: "Economista",
    mandatos: [mandate()],
    bio: null,
    stats: { total: 40, aprovadas: 12, por_tipo: null },
    iniciativas: [],
    ...overrides,
  };
}

describe("mandateLine", () => {
  it("joins legislature, group and constituency, with the status in brackets", () => {
    expect(mandateLine(mandate())).toBe("XVII · PS · Lisboa (Efetivo)");
  });

  it("drops missing parts", () => {
    expect(mandateLine(mandate({ grupoParlamentar: null, circuloEleitoral: null }))).toBe("XVII (Efetivo)");
  });

  it("omits the brackets when there is no status", () => {
    expect(mandateLine(mandate({ situacao: null }))).toBe("XVII · PS · Lisboa");
  });
});

describe("deputyFullMarkdown", () => {
  it("leads with the parliamentary name and shows the full one when it differs", () => {
    const md = deputyFullMarkdown(deputy());
    expect(md).toMatch(/^# Pedro Nuno Santos/);
    expect(md).toContain("_Pedro Nuno de Oliveira Santos_");
  });

  it("does not repeat an identical full name", () => {
    expect(deputyFullMarkdown(deputy({ nomeCompleto: "Pedro Nuno Santos" }))).not.toContain("_Pedro Nuno Santos_");
  });

  it("lists the personal facts it has", () => {
    const md = deputyFullMarkdown(deputy());
    expect(md).toContain("**Group:** PS");
    expect(md).toContain("**Constituency:** Lisboa");
    expect(md).toContain("**Profession:** Economista");
    expect(md).toContain("**Born:** 1 January 1977");
  });

  it("omits facts the record does not carry", () => {
    const md = deputyFullMarkdown(
      deputy({ grupoParlamentar: null, circuloEleitoral: null, profissao: null, dataNascimento: null }),
    );
    expect(md).not.toContain("**Group:**");
    expect(md).not.toContain("**Born:**");
  });

  it("leads the sections with the legislative record, not the CV", () => {
    const md = deputyFullMarkdown(deputy());
    expect(md).toContain("**40** initiatives authored");
    expect(md).toContain("**12** approved");
    expect(md.indexOf("## Legislative record")).toBeLessThan(md.indexOf("## Mandates"));
  });

  it("omits the record when the API sent no stats", () => {
    expect(deputyFullMarkdown(deputy({ stats: null }))).not.toContain("## Legislative record");
  });

  it("lists mandates", () => {
    expect(deputyFullMarkdown(deputy())).toContain("- XVII · PS · Lisboa (Efetivo)");
  });

  it("omits the mandates section when there are none", () => {
    expect(deputyFullMarkdown(deputy({ mandatos: [] }))).not.toContain("## Mandates");
  });

  it("renders each biography section that has entries", () => {
    const md = deputyFullMarkdown(
      deputy({
        bio: {
          habilitacoes: [{ id: 1, descricao: "Licenciatura em Economia", ordem: 1 }],
          titulos: [{ id: 2, descricao: "Mestre", ordem: 1 }],
          cargosFuncoes: [{ id: 3, descricao: "Ministro", ordem: 1 }],
          condecoracoes: [{ id: 4, descricao: "Ordem de Mérito", ordem: 1 }],
          obrasPublicadas: [{ id: 5, descricao: "Um livro", ordem: 1 }],
        },
      }),
    );
    expect(md).toContain("### Education\n- Licenciatura em Economia");
    expect(md).toContain("### Titles");
    expect(md).toContain("### Roles held");
    expect(md).toContain("### Honours");
    expect(md).toContain("### Published works");
  });

  it("skips biography sections that are empty or absent", () => {
    const md = deputyFullMarkdown(deputy({ bio: { habilitacoes: [], titulos: undefined } }));
    expect(md).not.toContain("### Education");
    expect(md).not.toContain("### Titles");
  });

  it("skips biography entries with no description", () => {
    const md = deputyFullMarkdown(deputy({ bio: { habilitacoes: [{ id: 1, descricao: null, ordem: 1 }] } }));
    expect(md).not.toContain("### Education");
  });

  it("omits the biography entirely when there is none", () => {
    expect(deputyFullMarkdown(deputy({ bio: null }))).not.toContain("### Education");
  });

  it("lists recent initiatives with their dates", () => {
    const md = deputyFullMarkdown(
      deputy({
        iniciativas: [
          {
            id: 1,
            legislaturaId: "XVII",
            numero: "1/XVII",
            tipo: "J",
            tipoDesc: "Projeto de Lei",
            titulo: "Uma lei",
            epigrafe: null,
            dataEntrada: "2026-03-04",
            dataFim: null,
            estado: null,
            linkTexto: null,
            updatedAt: "2026-08-01T00:00:00Z",
          },
          {
            id: 2,
            legislaturaId: "XVII",
            numero: "2/XVII",
            tipo: "J",
            tipoDesc: "Projeto de Lei",
            titulo: "Outra lei",
            epigrafe: null,
            dataEntrada: null,
            dataFim: null,
            estado: null,
            linkTexto: null,
            updatedAt: "2026-08-01T00:00:00Z",
          },
        ],
      }),
    );
    expect(md).toContain("- Uma lei (4 March 2026)");
    expect(md).toContain("- Outra lei");
  });

  it("omits the initiatives section when there are none", () => {
    expect(deputyFullMarkdown(deputy())).not.toContain("## Recent initiatives");
  });
});
