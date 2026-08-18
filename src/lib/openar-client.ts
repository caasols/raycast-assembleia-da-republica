/**
 * The single place this extension talks to openAR. Commands never call `fetch`.
 *
 * Hand-written rather than generated from docs/openar-openapi.json, matching
 * both reference extensions: the surface used here is small, and the parts
 * worth getting right — clamping, the 429 contract, validating that a response
 * is shaped as promised — are not what a generator produces.
 */
import { OpenArError, parseRetryAfterSeconds } from "./errors";
import { buildQueryString, clampLimit, clampPage, isQueryStringWithinLimit, truncateQ } from "./query";
import type { Iniciativa, Paginated, VotacaoListItem } from "./types";
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
): Promise<unknown> {
  const queryString = buildQueryString(params);
  if (!isQueryStringWithinLimit(queryString)) {
    // Raised before sending: the API answers this with a 400, and a local
    // failure with a clear cause beats a round trip to learn the same thing.
    throw new OpenArError(`Query is too long (${queryString.length} characters, maximum 500)`, 400);
  }

  const url = `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    // 429 is the one status a caller can act on by waiting, so `Retry-After`
    // is read here rather than left for each call site to remember.
    const retryAfter =
      response.status === 429 ? parseRetryAfterSeconds(response.headers.get("Retry-After")) : undefined;
    throw new OpenArError(await errorDetail(response), response.status, retryAfter);
  }

  return response.json();
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
    throw new OpenArError("openAR returned an unexpected response shape", 500);
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

/** Re-exported so callers get the length rule with the search parameter. */
export { truncateQ };
