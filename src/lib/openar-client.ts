/**
 * The single place this extension talks to openAR. Commands never call `fetch`.
 *
 * Hand-written rather than generated from the OpenAPI spec, matching
 * both reference extensions: the surface used here is small, and the parts
 * worth getting right — clamping, the 429 contract, validating that a response
 * is shaped as promised — are not what a generator produces.
 */
import { OpenArError, parseRetryAfterSeconds } from "./errors";
import { buildQueryString, clampLimit, clampPage, isQueryStringWithinLimit, truncateQ } from "./query";
import { cachedBody, knownEtag, remember } from "./etag-cache";
import type {
  Comissao,
  ComissaoDetail,
  Carreiras,
  Deputado,
  DeputadoDetail,
  DeputadoAtividade,
  Iniciativa,
  IniciativaDetail,
  Legislatura,
  Meta,
  Paginated,
  Peticao,
  PeticaoDetail,
  VotacaoListItem,
} from "./types";
import type { QueryValue } from "./query";

/**
 * The `/v1` is load-bearing. It lives in the spec's `servers[0].url`, not in
 * the documented paths, so requests against the bare host 404 — a mistake this
 * project's own notes made once already (context.md D19).
 */
export const BASE_URL = "https://api.openar.pt/v1";

/**
 * openAR is a small public service with a 100 req/min budget; a request that
 * has not answered in 10s is not going to, and a launcher must not hang on it.
 */
const REQUEST_TIMEOUT_MS = 10_000;

const REQUEST_HEADERS = { Accept: "application/json" };

/** Extracts openAR's `{ "error": "..." }` body, when the response carries one. */
async function errorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
      return (body as { error: string }).error;
    }
  } catch {
    // A non-JSON error body is normal for gateway-level failures; the status
    // line below is still a usable message, so this is not worth surfacing.
  }
  return response.statusText;
}

/**
 * Perform a GET against openAR and return the parsed JSON.
 *
 * `signal` lets a command cancel in-flight work — Raycast re-runs a search on
 * every keystroke, and without cancellation those responses race.
 */
export async function request(
  path: string,
  params: Record<string, QueryValue | QueryValue[]> = {},
  signal?: AbortSignal,
  /**
   * Opt in to conditional requests. Only the two detail endpoints openAR sends
   * weak ETags on can use this; asking elsewhere would send a header the server
   * ignores and cache a body that can never be revalidated.
   */
  revalidate = false,
): Promise<unknown> {
  const queryString = buildQueryString(params);
  if (!isQueryStringWithinLimit(queryString)) {
    // Raised before sending: the API answers this with a 400, and a local
    // failure with a clear cause beats a round trip to learn the same thing.
    throw new OpenArError(`Query is too long (${queryString.length} characters, maximum 500)`, 400);
  }

  const url = `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
  const etag = revalidate ? knownEtag(url) : undefined;
  const response = await fetch(url, {
    headers: etag ? { ...REQUEST_HEADERS, "If-None-Match": etag } : REQUEST_HEADERS,
    signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  // 304 carries no body: the one we already hold is still current. Reading
  // response.json() here would throw on an empty body.
  if (response.status === 304) {
    return cachedBody(url);
  }

  if (!response.ok) {
    // 429 is the one status a caller can act on by waiting, so `Retry-After`
    // is read here rather than left for each call site to remember.
    const retryAfter =
      response.status === 429 ? parseRetryAfterSeconds(response.headers.get("Retry-After")) : undefined;
    throw new OpenArError(await errorDetail(response), response.status, retryAfter);
  }

  const body: unknown = await response.json();
  if (revalidate) {
    remember(url, response.headers.get("ETag"), body);
  }
  return body;
}

/**
 * The error every malformed-payload check raises — one message, one place,
 * after the audit found the literal pasted nine times (context.md §6.4).
 */
function unexpectedShape(): OpenArError {
  return new OpenArError("openAR returned an unexpected response shape", 500);
}

/**
 * Narrow an unknown payload to the listing envelope.
 *
 * The check is deliberately shallow — `data` being an array is what callers
 * depend on, and re-validating every field of every row would be a second,
 * drifting copy of the schema. A row that is missing fields renders as a row
 * with gaps; a `data` that is not an array would throw inside `.map`, far from
 * the cause.
 */
function asPaginated<T>(payload: unknown): Paginated<T> {
  const envelope = payload as Partial<Paginated<T>> | null;
  if (!envelope || !Array.isArray(envelope.data)) {
    throw unexpectedShape();
  }
  return {
    data: envelope.data,
    total: typeof envelope.total === "number" ? envelope.total : envelope.data.length,
    page: typeof envelope.page === "number" ? envelope.page : 1,
    limit: typeof envelope.limit === "number" ? envelope.limit : envelope.data.length,
  };
}

export interface ListVotacoesParams {
  legislatura?: string;
  /** Exact, case-sensitive: `Aprovado` | `Rejeitado` | `Prejudicado`. */
  resultado?: string;
  unanime?: boolean;
  /** All votes on one initiative (IniId). */
  iniciativa?: number;
  tipo?: string;
  grupo?: string;
  aFavor?: string;
  contra?: string;
  abstencao?: string;
  /** Inclusive, `AAAA-MM-DD`. */
  dataInicio?: string;
  dataFim?: string;
  sort?: "desc" | "asc";
  page?: number;
  limit?: number;
}

/**
 * List plenary votes.
 *
 * Each row already carries its initiative's title and number, so a vote list
 * renders from this one request rather than fanning out per vote.
 */
export async function listVotacoes(
  params: ListVotacoesParams = {},
  signal?: AbortSignal,
): Promise<Paginated<VotacaoListItem>> {
  const payload = await request(
    "/votacoes",
    {
      legislatura: params.legislatura,
      resultado: params.resultado,
      // The API accepts only "true"/"false"/"1"/"0" as strings here and 400s on
      // anything else, so the boolean is converted rather than passed through.
      unanime: params.unanime === undefined ? undefined : String(params.unanime),
      iniciativa: params.iniciativa,
      tipo: params.tipo,
      grupo: params.grupo,
      a_favor: params.aFavor,
      contra: params.contra,
      abstencao: params.abstencao,
      data_inicio: params.dataInicio,
      data_fim: params.dataFim,
      sort: params.sort,
      page: params.page === undefined ? undefined : clampPage(params.page),
      limit: params.limit === undefined ? undefined : clampLimit(params.limit),
    },
    signal,
  );
  return asPaginated<VotacaoListItem>(payload);
}

export interface ListIniciativasParams {
  legislatura?: string;
  tipo?: string;
  /** Repeatable — the API explodes this into multiple keys, not a CSV. */
  estado?: string[];
  grupo?: string;
  /** Lowercase here: `aprovado` | `rejeitado` | `pendente`. Not the vote casing. */
  resultado?: string;
  dataInicio?: string;
  dataFim?: string;
  /** A numeric deputy id, or a partial case-insensitive parliamentary name. */
  deputado?: string;
  /** Free-text search over the title. Truncated to the API's 100-char cap. */
  q?: string;
  sort?: "desc" | "asc";
  page?: number;
  limit?: number;
}

/**
 * List legislative initiatives.
 *
 * `q` is truncated rather than rejected: a search box produces over-long input
 * by ordinary typing, and silently searching the first 100 characters is a
 * better answer than a 400 the user cannot act on.
 */
export async function listIniciativas(
  params: ListIniciativasParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Iniciativa>> {
  const payload = await request(
    "/iniciativas",
    {
      legislatura: params.legislatura,
      tipo: params.tipo,
      estado: params.estado,
      grupo: params.grupo,
      resultado: params.resultado,
      data_inicio: params.dataInicio,
      data_fim: params.dataFim,
      deputado: params.deputado,
      q: params.q === undefined ? undefined : truncateQ(params.q),
      sort: params.sort,
      page: params.page === undefined ? undefined : clampPage(params.page),
      limit: params.limit === undefined ? undefined : clampLimit(params.limit),
    },
    signal,
  );
  return asPaginated<Iniciativa>(payload);
}

/**
 * The values filters are built from. Cacheable for an hour — the longest
 * `max-age` openAR sets — so this is cheap to call at the top of a command.
 */
export async function getMeta(legislatura?: string, signal?: AbortSignal): Promise<Meta> {
  const payload = (await request("/meta", { legislatura }, signal)) as Partial<Meta> | null;
  if (!payload) {
    throw unexpectedShape();
  }
  return {
    legislaturas: payload.legislaturas ?? [],
    grupos: payload.grupos ?? [],
    tipos: payload.tipos ?? [],
    estados: payload.estados ?? [],
  };
}

/**
 * The five institutional authors that `/meta` prefixes onto `grupos`. They are
 * valid for `/iniciativas` and `/votacoes` but rejected by `/deputados`.
 */
export const INSTITUTIONAL_AUTHORS = ["Governo", "PAR", "Madeira", "Açores", "Mesa"] as const;

/**
 * Just the parliamentary groups, with the institutional authors removed.
 *
 * Needed wherever a dropdown feeds `/deputados?grupo=`, which 400s on the
 * institutional five. Kept as a filter over the live list rather than a
 * hardcoded set of parties, so a new party appearing in the data still works.
 */
export function parliamentaryGroups(grupos: string[]): string[] {
  return grupos.filter((grupo) => !INSTITUTIONAL_AUTHORS.includes(grupo as (typeof INSTITUTIONAL_AUTHORS)[number]));
}

export interface ListPeticoesParams {
  legislatura?: string;
  situacao?: string;
  q?: string;
  dataInicio?: string;
  dataFim?: string;
  sort?: "desc" | "asc";
  page?: number;
  limit?: number;
}

/** List petitions to parliament. */
export async function listPeticoes(params: ListPeticoesParams = {}, signal?: AbortSignal): Promise<Paginated<Peticao>> {
  const payload = await request(
    "/peticoes",
    {
      legislatura: params.legislatura,
      situacao: params.situacao,
      q: params.q === undefined ? undefined : truncateQ(params.q),
      data_inicio: params.dataInicio,
      data_fim: params.dataFim,
      sort: params.sort,
      page: params.page === undefined ? undefined : clampPage(params.page),
      limit: params.limit === undefined ? undefined : clampLimit(params.limit),
    },
    signal,
  );
  return asPaginated<Peticao>(payload);
}

export interface ListDeputadosParams {
  legislatura?: string;
  /** A party sigla only — the institutional authors are rejected here. */
  grupo?: string;
  q?: string;
  /** `ativo` is a shortcut for the 230 sitting seats. */
  situacao?: string;
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/**
 * List deputies. A deputy appears once, carrying their most recent mandate
 * that matches the filters — not once per mandate.
 */
export async function listDeputados(
  params: ListDeputadosParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Deputado>> {
  const payload = await request(
    "/deputados",
    {
      legislatura: params.legislatura,
      grupo: params.grupo,
      q: params.q === undefined ? undefined : truncateQ(params.q),
      situacao: params.situacao,
      sort: params.sort,
      page: params.page === undefined ? undefined : clampPage(params.page),
      limit: params.limit === undefined ? undefined : clampLimit(params.limit),
    },
    signal,
  );
  return asPaginated<Deputado>(payload);
}

/**
 * The URL of a deputy's official photo.
 *
 * Built rather than fetched: `/deputados/{id}/foto` is a 302 to the CDN, and an
 * `<img>` — or Raycast's icon loader — follows that itself. Existence is not
 * checked, so a deputy with no photo yields a CDN 404 and the caller needs a
 * fallback.
 */
export function deputadoPhotoUrl(id: number): string {
  return `${BASE_URL}/deputados/${id}/foto`;
}

/** Ranking of deputies by number of legislatures served. */
export async function listCarreiras(limit?: number, signal?: AbortSignal): Promise<Carreiras> {
  const payload = (await request(
    "/deputados/carreiras",
    { limit: limit === undefined ? undefined : clampLimit(limit) },
    signal,
  )) as Partial<Carreiras> | null;
  if (!payload || !Array.isArray(payload.data)) {
    throw unexpectedShape();
  }
  return { data: payload.data, stats: payload.stats ?? null };
}

export interface ListComissoesParams {
  legislatura?: string;
  q?: string;
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/** List parliamentary committees, each with a stable numeric id. */
export async function listComissoes(
  params: ListComissoesParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Comissao>> {
  const payload = await request(
    "/comissoes",
    {
      legislatura: params.legislatura,
      q: params.q === undefined ? undefined : truncateQ(params.q),
      sort: params.sort,
      page: params.page === undefined ? undefined : clampPage(params.page),
      limit: params.limit === undefined ? undefined : clampLimit(params.limit),
    },
    signal,
  );
  return asPaginated<Comissao>(payload);
}

/**
 * The relations this extension needs from an initiative.
 *
 * Sent explicitly, always. Omitting `include` makes openAR return *everything*
 * — authors, every event, every sub-relation including the debate transcripts —
 * which the spec warns reaches hundreds of KB for an old, heavily-debated
 * initiative. In a launcher that is a visible stall, so the cost is opted into
 * rather than inherited.
 */
export const INICIATIVA_INCLUDE = "autores,eventos.votacoes,eventos.publicacoes";

/** One initiative, with only the relations named in `include`. */
export async function getIniciativa(
  id: number,
  include: string = INICIATIVA_INCLUDE,
  signal?: AbortSignal,
): Promise<IniciativaDetail> {
  const payload = (await request(`/iniciativas/${id}`, { include }, signal, true)) as IniciativaDetail | null;
  if (!payload || typeof payload.id !== "number") {
    throw unexpectedShape();
  }
  return payload;
}

/**
 * One deputy, with mandates, biography, authorship stats and their 20 most
 * recent initiatives. No `include` parameter — this endpoint returns the lot.
 */
export async function getDeputado(id: number, signal?: AbortSignal): Promise<DeputadoDetail> {
  const payload = (await request(`/deputados/${id}`, {}, signal)) as DeputadoDetail | null;
  if (!payload || typeof payload.id !== "number") {
    throw unexpectedShape();
  }
  return {
    ...payload,
    mandatos: payload.mandatos ?? [],
    bio: payload.bio ?? null,
    stats: payload.stats ?? null,
    iniciativas: payload.iniciativas ?? [],
  };
}

/**
 * A deputy's parliamentary activity, optionally scoped to one legislature.
 *
 * Without `legislatura` this returns a deputy's entire career, which for a
 * long-serving member is a large payload — so the scope is worth passing.
 */
export async function getDeputadoAtividade(
  id: number,
  legislatura?: string,
  signal?: AbortSignal,
): Promise<DeputadoAtividade> {
  const payload = (await request(`/deputados/${id}/atividade`, { legislatura }, signal)) as DeputadoAtividade | null;
  if (!payload || typeof payload !== "object") {
    throw unexpectedShape();
  }
  return payload;
}

export interface GetComissaoParams {
  legislatura?: string;
  estado?: string;
  tipo?: string;
  q?: string;
  sort?: "desc" | "asc";
  page?: number;
  limit?: number;
}

/**
 * One committee and the initiatives that passed through it.
 *
 * Note the envelope: the pagination fields sit alongside the committee's own
 * metadata rather than wrapping it, so this cannot reuse `asPaginated`.
 */
export async function getComissao(
  id: number,
  params: GetComissaoParams = {},
  signal?: AbortSignal,
): Promise<ComissaoDetail> {
  const payload = (await request(
    `/comissoes/${id}`,
    {
      legislatura: params.legislatura,
      estado: params.estado,
      tipo: params.tipo,
      q: params.q === undefined ? undefined : truncateQ(params.q),
      sort: params.sort,
      page: params.page === undefined ? undefined : clampPage(params.page),
      limit: params.limit === undefined ? undefined : clampLimit(params.limit),
    },
    signal,
  )) as ComissaoDetail | null;
  if (!payload || !Array.isArray(payload.data)) {
    throw unexpectedShape();
  }
  return {
    ...payload,
    legislaturas: payload.legislaturas ?? [],
    total: typeof payload.total === "number" ? payload.total : payload.data.length,
    page: typeof payload.page === "number" ? payload.page : 1,
    limit: typeof payload.limit === "number" ? payload.limit : payload.data.length,
  };
}

/** The relations this extension needs from a petition. */
export const PETICAO_INCLUDE = "comissoes.relatorioFinal,documentos";

/** One petition, with only the relations named in `include`. */
export async function getPeticao(
  id: number,
  include: string = PETICAO_INCLUDE,
  signal?: AbortSignal,
): Promise<PeticaoDetail> {
  // `true`: this is the second of the two endpoints openAR sends weak ETags on.
  const payload = (await request(`/peticoes/${id}`, { include }, signal, true)) as PeticaoDetail | null;
  if (!payload || typeof payload.id !== "number") {
    throw unexpectedShape();
  }
  return payload;
}

/**
 * Every legislature, oldest first.
 *
 * The documented exception to the listing envelope: a bare array, no
 * pagination, no `{ data, total }` wrapper — so this deliberately does not go
 * through `asPaginated`.
 */
export async function listLegislaturas(signal?: AbortSignal): Promise<Legislatura[]> {
  const payload = await request("/legislaturas", {}, signal);
  if (!Array.isArray(payload)) {
    throw unexpectedShape();
  }
  return payload as Legislatura[];
}

/**
 * The legislature currently sitting, identified by `dataFim === null`.
 *
 * Resolved from the data rather than hardcoded: `XVII` is correct today and
 * wrong the day after the next election, and a hardcoded value fails silently
 * by quietly showing a closed legislature as if it were live.
 */
export function currentLegislature(legislaturas: Legislatura[]): Legislatura | undefined {
  return legislaturas.find((l) => l.dataFim === null);
}

/** Re-exported so callers get the length rule with the search parameter. */
export { truncateQ };
