import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BASE_URL, listIniciativas, listVotacoes, request } from "./openar-client";
import { OpenArError } from "./errors";
import type { VotacaoListItem } from "./types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

/** A `Response`-alike carrying only what the client actually reads. */
function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    headers: new Headers(init.headers),
    json: async () => body,
  };
}

const VOTE: VotacaoListItem = {
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
  iniciativaTitulo: "Orçamento do Estado",
  iniciativaNumero: "1/XVII",
  iniciativaTipo: "P",
  legislaturaId: "XVII",
};

function requestedUrl(): URL {
  return new URL(fetchMock.mock.calls[0][0] as string);
}

describe("request", () => {
  it("prefixes every path with the /v1 base, which the docs omit", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await request("/meta");
    // The prefix lives in servers[0].url, not the documented paths; without it
    // every call 404s.
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/meta`);
    expect(BASE_URL).toBe("https://api.openar.pt/v1");
  });

  it("omits the '?' entirely when there are no parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await request("/meta", { legislatura: undefined });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/meta`);
  });

  it("appends a query string when there are parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await request("/meta", { legislatura: "XVII" });
    expect(requestedUrl().searchParams.get("legislatura")).toBe("XVII");
  });

  it("asks for JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await request("/meta");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Accept: "application/json" } });
  });

  it("rejects an over-long query locally instead of spending a request on a 400", async () => {
    await expect(request("/iniciativas", { q: "x".repeat(600) })).rejects.toThrow(OpenArError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes a caller's AbortSignal through, so a re-run can cancel the old request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const controller = new AbortController();
    await request("/meta", {}, controller.signal);
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it("applies a timeout when the caller gives no signal", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await request("/meta");
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("raises an OpenArError carrying the status for a non-2xx response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Recurso não encontrado" }, { status: 404 }));
    await expect(request("/votacoes/nope")).rejects.toMatchObject({
      status: 404,
      message: "Recurso não encontrado",
    });
  });

  it("reads Retry-After on a 429 so the caller need not remember to", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } }),
    );
    await expect(request("/votacoes")).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 60,
      isRateLimited: true,
    });
  });

  it("does not look for Retry-After on statuses where it means nothing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "nope" }, { status: 400, headers: { "Retry-After": "60" } }));
    await expect(request("/votacoes")).rejects.toMatchObject({ retryAfterSeconds: undefined });
  });

  it("falls back to the status line when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError("Unexpected token '<'");
      },
    });
    await expect(request("/votacoes")).rejects.toMatchObject({ status: 502, message: "Bad Gateway" });
  });

  it("falls back to the status line when the error body has no `error` string", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }, { status: 500 }));
    await expect(request("/votacoes")).rejects.toMatchObject({ message: "status 500" });
  });

  it("falls back to the status line when the error body is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, { status: 503 }));
    await expect(request("/votacoes")).rejects.toMatchObject({ message: "status 503" });
  });
});

describe("listVotacoes", () => {
  it("returns the envelope's rows", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [VOTE], total: 1, page: 1, limit: 50 }));
    const result = await listVotacoes();
    expect(result.data).toEqual([VOTE]);
    expect(result.total).toBe(1);
  });

  it("sends no parameters at all when given none", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listVotacoes();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/votacoes`);
  });

  it("maps camelCase options onto the API's snake_case parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listVotacoes({ aFavor: "PS", dataInicio: "2026-08-01", dataFim: "2026-08-18" });
    const params = requestedUrl().searchParams;
    expect(params.get("a_favor")).toBe("PS");
    expect(params.get("data_inicio")).toBe("2026-08-01");
    expect(params.get("data_fim")).toBe("2026-08-18");
  });

  it("passes the remaining filters through unchanged", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listVotacoes({
      legislatura: "XVII",
      resultado: "Aprovado",
      iniciativa: 42,
      tipo: "J",
      grupo: "Governo",
      contra: "CH",
      abstencao: "IL",
      sort: "asc",
    });
    const params = requestedUrl().searchParams;
    expect(Object.fromEntries(params)).toMatchObject({
      legislatura: "XVII",
      resultado: "Aprovado",
      iniciativa: "42",
      tipo: "J",
      grupo: "Governo",
      contra: "CH",
      abstencao: "IL",
      sort: "asc",
    });
  });

  it("sends `unanime` as a string, the only form the API accepts", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listVotacoes({ unanime: false });
    // `false` would otherwise be dropped as falsy, or 400 as a raw boolean.
    expect(requestedUrl().searchParams.get("unanime")).toBe("false");
  });

  it("clamps page and limit to the documented range", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listVotacoes({ page: 0, limit: 5000 });
    const params = requestedUrl().searchParams;
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("200");
  });

  it("throws a typed error rather than a TypeError when `data` is not an array", async () => {
    // Without this the failure would surface deep inside a `.map` in the view,
    // far from the response that caused it.
    fetchMock.mockResolvedValue(jsonResponse({ total: 0 }));
    await expect(listVotacoes()).rejects.toThrow(OpenArError);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(listVotacoes()).rejects.toThrow("unexpected response shape");
  });

  it("fills in envelope counters the API omitted, rather than reporting NaN", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [VOTE] }));
    const result = await listVotacoes();
    expect(result).toMatchObject({ total: 1, page: 1, limit: 1 });
  });
});

describe("listIniciativas", () => {
  const INITIATIVE = { id: 1, titulo: "Altera o Código do Trabalho" };

  it("returns the envelope's rows", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [INITIATIVE], total: 1, page: 1, limit: 50 }));
    const result = await listIniciativas();
    expect(result.data).toEqual([INITIATIVE]);
  });

  it("sends no parameters when given none", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listIniciativas();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/iniciativas`);
  });

  it("truncates an over-long `q` rather than earning a 400", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listIniciativas({ q: "x".repeat(160) });
    // A search box produces over-long input by ordinary typing; searching the
    // first 100 characters beats an error the user cannot act on.
    expect(requestedUrl().searchParams.get("q")).toHaveLength(100);
  });

  it("repeats `estado` per value, since the API explodes it rather than reading a CSV", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listIniciativas({ estado: ["Lei (Publicação DR)", "Iniciativa Caducada"] });
    expect(requestedUrl().searchParams.getAll("estado")).toHaveLength(2);
  });

  it("maps camelCase dates onto the API's snake_case parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listIniciativas({ dataInicio: "2026-01-01", dataFim: "2026-12-31" });
    const params = requestedUrl().searchParams;
    expect(params.get("data_inicio")).toBe("2026-01-01");
    expect(params.get("data_fim")).toBe("2026-12-31");
  });

  it("passes the remaining filters through unchanged", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listIniciativas({
      legislatura: "XVII",
      tipo: "J",
      grupo: "PS",
      resultado: "aprovado",
      deputado: "Pedro",
      sort: "asc",
    });
    expect(Object.fromEntries(requestedUrl().searchParams)).toMatchObject({
      legislatura: "XVII",
      tipo: "J",
      grupo: "PS",
      // Lowercase here — /votacoes uses the capitalised vocabulary instead.
      resultado: "aprovado",
      deputado: "Pedro",
      sort: "asc",
    });
  });

  it("clamps page and limit to the documented range", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listIniciativas({ page: -2, limit: 900 });
    const params = requestedUrl().searchParams;
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("200");
  });

  it("throws a typed error when the envelope is malformed", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total: 3 }));
    await expect(listIniciativas()).rejects.toThrow(OpenArError);
  });
});
