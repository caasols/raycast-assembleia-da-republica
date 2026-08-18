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
