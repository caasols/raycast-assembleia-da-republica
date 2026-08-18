/**
 * Types for the openAR responses this extension actually consumes.
 *
 * Hand-written rather than generated from docs/openar-openapi.json: the
 * extension touches a handful of the spec's 16 endpoints, generated types for
 * all of them would be dead weight, and the traps worth encoding here — the
 * compound vote key, the per-endpoint casing of `resultado` — are exactly the
 * things a generator flattens away. The spec stays the source of truth; this
 * file is the subset we rely on. Both reference extensions do the same.
 *
 * Excluded from coverage in vitest.config.ts: no runtime code is emitted.
 */

/** The envelope every listing endpoint returns, except `/legislaturas`. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * A plenary vote's outcome. Capitalised, and matched exactly — the spec says
 * "correspondência exacta, sensível a maiúsculas" for `/votacoes?resultado=`.
 * `/iniciativas?resultado=` takes the lowercase form instead; they are
 * different vocabularies and must not be shared.
 */
export type VotacaoResultado = "Aprovado" | "Rejeitado" | "Prejudicado";

export interface Votacao {
  id: string;
  data: string | null;
  resultado: VotacaoResultado;
  unanime: boolean;
  reuniao: string | null;
  tipoReuniao: string | null;
  descricao: string | null;
  /** Party siglas voting in favour. */
  aFavor: string[];
  contra: string[];
  abstencao: string[];
  ausencias: string[];
  /**
   * The raw AR HTML the three arrays above are parsed from. For roll-call
   * votes it names individual deputies, which the arrays cannot express.
   */
  detalhe: string | null;
}

/**
 * A vote as it appears in a `/votacoes` listing: the vote plus enough of its
 * initiative to render a row without a second request.
 */
export interface VotacaoListItem extends Votacao {
  iniciativaId: number;
  iniciativaTitulo: string;
  iniciativaNumero: string;
  iniciativaTipo: string;
  legislaturaId: string;
}

/**
 * The identity of a vote.
 *
 * A vote id is unique *per initiative*, not globally — `/votacoes/{id}`
 * requires `iniciativa_id` and 400s without it. Passing a bare `id` between
 * views cannot resolve back to a vote, so the pair travels together.
 */
export interface VotacaoKey {
  id: string;
  iniciativaId: number;
}

/**
 * The nine single-letter initiative types, as `/iniciativas?tipo=` accepts
 * them. `/meta` reports which are actually present in the data, which is a
 * smaller set — this is the vocabulary, not the menu.
 */
export type IniciativaTipo = "R" | "P" | "J" | "D" | "S" | "A" | "I" | "C" | "F";

export interface Iniciativa {
  id: number;
  legislaturaId: string;
  numero: string;
  tipo: IniciativaTipo;
  /** Human-readable type, e.g. "Projeto de Lei". */
  tipoDesc: string;
  titulo: string;
  epigrafe: string | null;
  dataEntrada: string | null;
  dataFim: string | null;
  /**
   * The stage of the last recorded event — **not** a verdict on approval. The
   * spec is explicit: "Fase do último evento registado — não é um veredicto de
   * aprovação". `Aprovado` is not one of its values; approval is a separate
   * `resultado` filter.
   */
  estado: string | null;
  /** URL of the full text, as a PDF. */
  linkTexto: string | null;
  updatedAt: string;
}

/** `/meta` — the values every filter dropdown is built from. */
export interface Meta {
  legislaturas: string[];
  /**
   * Party siglas, **prefixed** with the five institutional authors `Governo`,
   * `PAR`, `Madeira`, `Açores`, `Mesa`. Those five are accepted by
   * `/iniciativas?grupo=` and `/votacoes?grupo=` but **rejected** by
   * `/deputados?grupo=`, so a single shared dropdown across all three would
   * produce 400s. Filter per endpoint — see `parliamentaryGroups`.
   */
  grupos: string[];
  tipos: { tipo: string; tipoDesc: string }[];
  estados: string[];
}

export interface Peticao {
  id: number;
  legislaturaId: string;
  numero: string | null;
  assunto: string | null;
  autor: string | null;
  dataEntrada: string | null;
  assinaturas: number | null;
  assinaturasInicial: number | null;
  situacao: string | null;
  urlTexto: string | null;
  dataDebate: string | null;
  updatedAt: string;
}

export interface Deputado {
  id: number;
  nomeParlamentar: string;
  nomeCompleto: string;
  grupoParlamentar: string | null;
  circuloEleitoral: string | null;
  legislaturaId: string;
  situacao: string | null;
  updatedAt: string;
}

export interface Carreira {
  id: number;
  nomeParlamentar: string;
  /** Distinct legislatures served; `Suplente` mandates are excluded. */
  totalLegs: number;
  firstLegStart: string | null;
  lastLegStart: string | null;
  lastParty: string | null;
  legIds: string[];
}

export interface Carreiras {
  data: Carreira[];
  /** Aggregates over **all** deputies, not just the returned page. */
  stats: { totalDeputies: number; singleTerm: number; avgLegs: number } | null;
}

export interface Comissao {
  id: number;
  sigla: string | null;
  nome: string | null;
}
