/**
 * Shared test fixtures — the entities more than two test files were pasting
 * as full literals (the largest family of duplicated code an audit found).
 *
 * Each builder returns a complete, realistic record and takes overrides, so a
 * test states only the fields it is actually about. Defaults are canonical:
 * change one here and every assertion pinned to it will say so. Richer shapes
 * used by a single suite (mandates, biographies) stay local to that suite —
 * extraction happens on the third use, not in anticipation.
 */
import type { Carreira, Deputado, Iniciativa, Paginated, Peticao, VotacaoListItem } from "../src/lib/types";

/** A plenary vote as `/votacoes` lists it, with its initiative alongside. */
export function vote(overrides: Partial<VotacaoListItem> = {}): VotacaoListItem {
  return {
    id: "v1",
    data: "2026-08-18",
    resultado: "Aprovado",
    unanime: false,
    reuniao: null,
    tipoReuniao: "RP",
    descricao: null,
    aFavor: ["PS", "PSD"],
    contra: ["CH"],
    abstencao: ["IL"],
    ausencias: [],
    detalhe: null,
    iniciativaId: 42,
    iniciativaTitulo: "Orçamento do Estado para 2027",
    iniciativaNumero: "1/XVII",
    iniciativaTipo: "P",
    legislaturaId: "XVII",
    ...overrides,
  };
}

export function initiative(overrides: Partial<Iniciativa> = {}): Iniciativa {
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

export function petition(overrides: Partial<Peticao> = {}): Peticao {
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

export function deputy(overrides: Partial<Deputado> = {}): Deputado {
  return {
    id: 4321,
    nomeParlamentar: "Pedro Nuno Santos",
    nomeCompleto: "Pedro Nuno de Oliveira Santos",
    grupoParlamentar: "PS",
    circuloEleitoral: "Lisboa",
    legislaturaId: "XVII",
    situacao: "Efetivo",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

export function career(overrides: Partial<Carreira> = {}): Carreira {
  return {
    id: 7,
    nomeParlamentar: "António Filipe",
    totalLegs: 11,
    firstLegStart: "1991-10-31",
    lastLegStart: "2024-03-26",
    lastParty: "PCP",
    legIds: ["VI", "VII", "VIII"],
    ...overrides,
  };
}

/** The listing envelope, with `total` defaulting to what fits on the page. */
export function page<T>(data: T[], total = data.length, limit = 50): Paginated<T> {
  return { data, total, page: 1, limit };
}
