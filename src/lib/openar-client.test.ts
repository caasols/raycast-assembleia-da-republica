import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BASE_URL,
  deputadoPhotoUrl,
  getComissao,
  getDeputado,
  getDeputadoAtividade,
  getIniciativa,
  getMeta,
  getPeticao,
  INICIATIVA_INCLUDE,
  INSTITUTIONAL_AUTHORS,
  listCarreiras,
  listComissoes,
  listDeputados,
  listLegislaturas,
  currentLegislature,
  listIniciativas,
  listPeticoes,
  listVotacoes,
  parliamentaryGroups,
  request,
} from "./openar-client";
import { OpenArError } from "./errors";
import { __clearEtagCache } from "./etag-cache";
import { vote } from "../../test/fixtures";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  __clearEtagCache();
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

const VOTE = vote();

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

  it("passes the API's own counters through when they differ from the fallbacks", async () => {
    // Values chosen to differ from every fallback (data.length, 1): a fixture
    // where the fallback happens to equal the real value cannot tell the
    // passthrough from the fallback — mutation testing caught exactly that.
    fetchMock.mockResolvedValue(jsonResponse({ data: [VOTE], total: 37, page: 3, limit: 10 }));
    expect(await listVotacoes()).toMatchObject({ total: 37, page: 3, limit: 10 });
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

describe("getMeta", () => {
  it("returns the four filter vocabularies", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        legislaturas: ["XVII"],
        grupos: ["PS"],
        tipos: [{ tipo: "J", tipoDesc: "Projeto de Lei" }],
        estados: ["Lei"],
      }),
    );
    const meta = await getMeta();
    expect(meta.legislaturas).toEqual(["XVII"]);
    expect(meta.tipos[0].tipoDesc).toBe("Projeto de Lei");
  });

  it("scopes to a legislature when asked", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await getMeta("XVII");
    expect(requestedUrl().searchParams.get("legislatura")).toBe("XVII");
  });

  it("defaults every vocabulary to empty rather than undefined", async () => {
    // A dropdown mapping over `undefined` throws; an empty dropdown does not.
    fetchMock.mockResolvedValue(jsonResponse({}));
    expect(await getMeta()).toEqual({ legislaturas: [], grupos: [], tipos: [], estados: [] });
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(getMeta()).rejects.toThrow(OpenArError);
  });
});

describe("parliamentaryGroups", () => {
  it("drops the five institutional authors, which /deputados rejects", () => {
    const grupos = [...INSTITUTIONAL_AUTHORS, "PS", "PSD", "CH"];
    expect(parliamentaryGroups(grupos)).toEqual(["PS", "PSD", "CH"]);
  });

  it("keeps a party it has never seen, rather than matching a hardcoded list", () => {
    expect(parliamentaryGroups(["PS", "NOVO"])).toEqual(["PS", "NOVO"]);
  });

  it("returns nothing when the list is only institutional authors", () => {
    expect(parliamentaryGroups([...INSTITUTIONAL_AUTHORS])).toEqual([]);
  });
});

describe("listPeticoes", () => {
  it("returns the envelope's rows", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: 1 }], total: 1, page: 1, limit: 50 }));
    expect((await listPeticoes()).data).toHaveLength(1);
  });

  it("maps its parameters onto the API's names", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listPeticoes({
      legislatura: "XVII",
      situacao: "Admitida",
      q: "saúde",
      dataInicio: "2026-01-01",
      dataFim: "2026-12-31",
      sort: "asc",
      page: 0,
      limit: 900,
    });
    const params = requestedUrl().searchParams;
    expect(Object.fromEntries(params)).toMatchObject({
      legislatura: "XVII",
      situacao: "Admitida",
      q: "saúde",
      data_inicio: "2026-01-01",
      data_fim: "2026-12-31",
      sort: "asc",
      page: "1",
      limit: "200",
    });
  });

  it("truncates an over-long query", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listPeticoes({ q: "x".repeat(200) });
    expect(requestedUrl().searchParams.get("q")).toHaveLength(100);
  });

  it("requests the petitions endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listPeticoes();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/peticoes`);
  });

  it("throws on a malformed envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(listPeticoes()).rejects.toThrow(OpenArError);
  });
});

describe("listDeputados", () => {
  it("returns the envelope's rows", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: 7 }], total: 1, page: 1, limit: 50 }));
    expect((await listDeputados()).data).toHaveLength(1);
  });

  it("passes its filters through, including the 230-seat shortcut", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listDeputados({
      legislatura: "XVII",
      grupo: "PS",
      q: "Pedro",
      situacao: "ativo",
      sort: "asc",
      page: 2,
      limit: 30,
    });
    expect(Object.fromEntries(requestedUrl().searchParams)).toMatchObject({
      legislatura: "XVII",
      grupo: "PS",
      q: "Pedro",
      situacao: "ativo",
      sort: "asc",
      page: "2",
      limit: "30",
    });
  });

  it("requests the deputies endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listDeputados();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/deputados`);
  });

  it("truncates an over-long name search", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listDeputados({ q: "y".repeat(180) });
    expect(requestedUrl().searchParams.get("q")).toHaveLength(100);
  });

  it("throws on a malformed envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: "nope" }));
    await expect(listDeputados()).rejects.toThrow(OpenArError);
  });
});

describe("deputadoPhotoUrl", () => {
  it("points at the redirecting endpoint, which the image loader follows itself", () => {
    expect(deputadoPhotoUrl(4321)).toBe(`${BASE_URL}/deputados/4321/foto`);
  });
});

describe("listCarreiras", () => {
  it("returns the ranking and the aggregate stats", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ id: 1, totalLegs: 9 }], stats: { totalDeputies: 3000, singleTerm: 1200, avgLegs: 1.8 } }),
    );
    const result = await listCarreiras();
    expect(result.data[0].totalLegs).toBe(9);
    // Stats cover every deputy, not just the returned page.
    expect(result.stats?.totalDeputies).toBe(3000);
  });

  it("clamps the limit", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    await listCarreiras(9000);
    expect(requestedUrl().searchParams.get("limit")).toBe("200");
  });

  it("sends no limit when none was asked for", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    await listCarreiras();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/deputados/carreiras`);
  });

  it("returns null stats rather than undefined when the API omits them", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    expect((await listCarreiras()).stats).toBeNull();
  });

  it("throws when the ranking is missing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ stats: {} }));
    await expect(listCarreiras()).rejects.toThrow(OpenArError);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(listCarreiras()).rejects.toThrow(OpenArError);
  });
});

describe("listComissoes", () => {
  it("returns the envelope's rows", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: 42, sigla: "CACDLG" }], total: 1, page: 1, limit: 50 }));
    expect((await listComissoes()).data[0].sigla).toBe("CACDLG");
  });

  it("passes its filters through", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listComissoes({ legislatura: "XVII", q: "saúde", sort: "asc", page: 3, limit: 10 });
    expect(Object.fromEntries(requestedUrl().searchParams)).toMatchObject({
      legislatura: "XVII",
      q: "saúde",
      sort: "asc",
      page: "3",
      limit: "10",
    });
  });

  it("requests the committees endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listComissoes();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/comissoes`);
  });

  it("truncates an over-long query", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listComissoes({ q: "z".repeat(150) });
    expect(requestedUrl().searchParams.get("q")).toHaveLength(100);
  });

  it("throws on a malformed envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(listComissoes()).rejects.toThrow(OpenArError);
  });
});

describe("getIniciativa", () => {
  it("always sends an explicit include, so the default hundreds-of-KB payload is never fetched", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42, titulo: "Bill" }));
    await getIniciativa(42);
    const include = requestedUrl().searchParams.get("include");
    expect(include).toBe(INICIATIVA_INCLUDE);
    // Omitting include makes openAR return every relation, including debate
    // transcripts — a visible stall in a launcher.
    expect(include).toContain("eventos.votacoes");
  });

  it("lets a caller narrow the relations further", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42 }));
    await getIniciativa(42, "autores");
    expect(requestedUrl().searchParams.get("include")).toBe("autores");
  });

  it("requests the initiative by id", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42 }));
    await getIniciativa(42);
    expect(requestedUrl().pathname).toBe("/v1/iniciativas/42");
  });

  it("throws when the payload is not an initiative", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "nope" }));
    await expect(getIniciativa(42)).rejects.toThrow(OpenArError);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(getIniciativa(42)).rejects.toThrow(OpenArError);
  });
});

describe("getDeputado", () => {
  it("requests the deputy by id, with no include parameter", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7, mandatos: [], iniciativas: [] }));
    await getDeputado(7);
    expect(requestedUrl().pathname).toBe("/v1/deputados/7");
    expect(requestedUrl().searchParams.get("include")).toBeNull();
  });

  it("defaults the collections so a view can map over them unguarded", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));
    const deputy = await getDeputado(7);
    expect(deputy).toMatchObject({ mandatos: [], iniciativas: [], bio: null, stats: null });
  });

  it("keeps the collections the API did send", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 7, mandatos: [{ id: 1 }], iniciativas: [{ id: 2 }], bio: {}, stats: { total: 3 } }),
    );
    const deputy = await getDeputado(7);
    expect(deputy.mandatos).toHaveLength(1);
    expect(deputy.stats?.total).toBe(3);
  });

  it("throws when the payload is not a deputy", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ nome: "no id" }));
    await expect(getDeputado(7)).rejects.toThrow(OpenArError);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(getDeputado(7)).rejects.toThrow(OpenArError);
  });
});

describe("getComissao", () => {
  it("requests the committee by id", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42, data: [], total: 0, page: 1, limit: 100 }));
    await getComissao(42);
    expect(requestedUrl().pathname).toBe("/v1/comissoes/42");
  });

  it("passes its filters through and clamps paging", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42, data: [] }));
    await getComissao(42, {
      legislatura: "XVII",
      estado: "Lei",
      tipo: "J",
      q: "saúde",
      sort: "asc",
      page: 0,
      limit: 900,
    });
    expect(Object.fromEntries(requestedUrl().searchParams)).toMatchObject({
      legislatura: "XVII",
      estado: "Lei",
      tipo: "J",
      q: "saúde",
      sort: "asc",
      page: "1",
      limit: "200",
    });
  });

  it("truncates an over-long query", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42, data: [] }));
    await getComissao(42, { q: "q".repeat(150) });
    expect(requestedUrl().searchParams.get("q")).toHaveLength(100);
  });

  it("fills in the envelope counters the API omitted", async () => {
    // This endpoint puts pagination alongside the committee's metadata rather
    // than wrapping it, so it cannot reuse the shared envelope handling.
    fetchMock.mockResolvedValue(jsonResponse({ id: 42, data: [{ id: 1 }] }));
    const committee = await getComissao(42);
    expect(committee).toMatchObject({ total: 1, page: 1, limit: 1, legislaturas: [] });
  });

  it("passes the committee's own counters through when they differ from the fallbacks", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 42, data: [{ id: 1 }], total: 412, page: 5, limit: 25, legislaturas: ["XVII", "XVI"] }),
    );
    expect(await getComissao(42)).toMatchObject({ total: 412, page: 5, limit: 25, legislaturas: ["XVII", "XVI"] });
  });

  it("throws when the initiatives list is missing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42 }));
    await expect(getComissao(42)).rejects.toThrow(OpenArError);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(getComissao(42)).rejects.toThrow(OpenArError);
  });
});

describe("listLegislaturas", () => {
  it("returns the bare array, since this endpoint has no envelope", async () => {
    // The documented exception: no { data, total, page, limit } wrapper.
    fetchMock.mockResolvedValue(jsonResponse([{ id: "XVII", dataFim: null }]));
    const result = await listLegislaturas();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("XVII");
  });

  it("requests the endpoint with no parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await listLegislaturas();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/legislaturas`);
  });

  it("throws when the payload is an envelope rather than an array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    await expect(listLegislaturas()).rejects.toThrow(OpenArError);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(listLegislaturas()).rejects.toThrow(OpenArError);
  });
});

describe("currentLegislature", () => {
  const leg = (id: string, dataFim: string | null) => ({
    id,
    nome: `${id} Legislatura`,
    dataInicio: "2020-01-01",
    dataFim,
    arId: null,
    siglaAntiga: null,
  });

  it("finds the one still sitting, by its null end date", () => {
    // Resolved from the data rather than hardcoded: XVII is correct today and
    // wrong the day after the next election.
    expect(currentLegislature([leg("XVI", "2025-06-02"), leg("XVII", null)])?.id).toBe("XVII");
  });

  it("returns undefined when every legislature has ended", () => {
    expect(currentLegislature([leg("XVI", "2025-06-02")])).toBeUndefined();
  });

  it("returns undefined for an empty list", () => {
    expect(currentLegislature([])).toBeUndefined();
  });
});

describe("conditional requests", () => {
  const INITIATIVE = { id: 42, titulo: "Bill" };

  it("sends no If-None-Match the first time a resource is seen", async () => {
    fetchMock.mockResolvedValue(jsonResponse(INITIATIVE, { headers: { ETag: 'W/"v1"' } }));
    await getIniciativa(42);
    expect(fetchMock.mock.calls[0][1].headers["If-None-Match"]).toBeUndefined();
  });

  it("sends the stored etag on the next request for the same resource", async () => {
    fetchMock.mockResolvedValue(jsonResponse(INITIATIVE, { headers: { ETag: 'W/"v1"' } }));
    await getIniciativa(42);
    await getIniciativa(42);
    expect(fetchMock.mock.calls[1][1].headers["If-None-Match"]).toBe('W/"v1"');
  });

  it("reuses the held body on a 304, which carries none of its own", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INITIATIVE, { headers: { ETag: 'W/"v1"' } }));
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 304,
      statusText: "Not Modified",
      headers: new Headers(),
      // Reading this would throw on a real 304's empty body; the client must
      // not call it.
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    });
    // Two calls: the first stores the body and its etag, the second is the one
    // that comes back 304 and must reuse what we already hold.
    await getIniciativa(42);
    expect(await getIniciativa(42)).toEqual(INITIATIVE);
  });

  it("does not treat a 304 as an error, despite `ok` being false", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INITIATIVE, { headers: { ETag: 'W/"v1"' } }));
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 304,
      statusText: "Not Modified",
      headers: new Headers(),
      json: async () => undefined,
    });
    await getIniciativa(42);
    await expect(getIniciativa(42)).resolves.toBeDefined();
  });

  it("keeps the newer body when the resource changed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 42, titulo: "Old" }, { headers: { ETag: 'W/"v1"' } }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 42, titulo: "New" }, { headers: { ETag: 'W/"v2"' } }));
    await getIniciativa(42);
    expect(await getIniciativa(42)).toMatchObject({ titulo: "New" });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 42 }, { headers: { ETag: 'W/"v2"' } }));
    await getIniciativa(42);
    expect(fetchMock.mock.calls[2][1].headers["If-None-Match"]).toBe('W/"v2"');
  });

  it("does not revalidate endpoints openAR sends no etag on", async () => {
    // Sending If-None-Match where the server ignores it would cache a body that
    // can never be revalidated.
    fetchMock.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }));
    await listVotacoes();
    await listVotacoes();
    expect(fetchMock.mock.calls[1][1].headers["If-None-Match"]).toBeUndefined();
  });

  it("stays opted out even when a list response unexpectedly carries an ETag", async () => {
    // Revalidation is opt-in per call (D81), not triggered by the server's
    // headers: a list body that arrived with an ETag must still not be stored
    // or revalidated, or the client would quietly start caching endpoints it
    // never chose to.
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [], total: 0, page: 1, limit: 50 }, { headers: { ETag: 'W/"l1"' } }),
    );
    await listVotacoes();
    await listVotacoes();
    expect(fetchMock.mock.calls[1][1].headers["If-None-Match"]).toBeUndefined();
  });

  it("revalidates petition details too, the other etag endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }, { headers: { ETag: 'W/"p1"' } }));
    await getPeticao(7);
    await getPeticao(7);
    expect(fetchMock.mock.calls[1][1].headers["If-None-Match"]).toBe('W/"p1"');
  });
});

describe("getPeticao", () => {
  it("requests the petition by id", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));
    await getPeticao(7);
    expect(requestedUrl().pathname).toBe("/v1/peticoes/7");
  });

  it("always sends an explicit include", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));
    await getPeticao(7);
    expect(requestedUrl().searchParams.get("include")).toBe("comissoes.relatorioFinal,documentos");
  });

  it("lets a caller narrow the relations", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));
    await getPeticao(7, "documentos");
    expect(requestedUrl().searchParams.get("include")).toBe("documentos");
  });

  it("throws when the payload is not a petition", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "nope" }));
    await expect(getPeticao(7)).rejects.toThrow(OpenArError);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(getPeticao(7)).rejects.toThrow(OpenArError);
  });
});

describe("getDeputadoAtividade", () => {
  it("requests the activity endpoint for the deputy", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ deputado: { id: 7 } }));
    await getDeputadoAtividade(7);
    expect(requestedUrl().pathname).toBe("/v1/deputados/7/atividade");
  });

  it("scopes to a legislature when given one", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await getDeputadoAtividade(7, "XVII");
    expect(requestedUrl().searchParams.get("legislatura")).toBe("XVII");
  });

  it("returns the whole career when unscoped", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await getDeputadoAtividade(7);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/deputados/7/atividade`);
  });

  it("throws when the payload is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await expect(getDeputadoAtividade(7)).rejects.toThrow(OpenArError);
  });
});
