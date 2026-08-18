# openAR API — vendored reference

Transcribed from the official API reference at `openar.pt`, captured
2026-08-18 07:49 (`REFERÊNCIA DA API · REST · OPENAPI 3.1`).

Vendored because `api.openar.pt` is blocked by the dev environment's egress
proxy (`context.md` §3), so sessions cannot read the live spec.

> ### ⚠️ This capture is INCOMPLETE
> The source PDF was truncated mid-`/iniciativas`, at its `RESPOSTA 200`
> heading. **`/votacoes`, `/peticoes` and `/comissoes` are entirely missing** —
> their existence is confirmed by cross-references elsewhere in the document
> (see §7), but their paths, parameters and response shapes were not captured.
>
> `/votacoes` is the endpoint behind the extension's first planned command, so
> **this must be completed before P3 can start.** Re-export the full page, or
> fetch `https://api.openar.pt/openapi.json` from an unblocked machine and
> commit it alongside this file.

---

## 1. Basics

| | |
|---|---|
| **Base URL** | `https://api.openar.pt` |
| **Spec** | OpenAPI 3.1, at `/openapi.json` |
| **Auth** | **None.** All endpoints public. |
| **Methods** | `GET`, `HEAD`, `OPTIONS` only |
| **Source** | AR *dados abertos* programme, **updated daily** |
| **CDN** | `cdn.openar.pt` (deputy photos) |

## 2. Rate limits

**100 requests per minute per IP**, sliding window. Every response carries
`X-RateLimit-Limit` and `X-RateLimit-Remaining`. On exceeding the limit the API
returns **429** with `Retry-After: 60`.

> **Design consequence:** 100/min is generous for a launcher but trivially
> exceeded by an unthrottled type-ahead search. Any search command must debounce
> and must handle 429 by honouring `Retry-After` — not by retrying blindly.
> `429` is listed as a possible error on *every* endpoint.

## 3. Input limits

- Query string: **max 500 characters**
- `q` parameter: **max 100 characters**

Both return **400** when exceeded. Validate client-side before sending.

## 4. Caching

- All responses carry `Cache-Control`: `max-age=300` (5 min), or **3600**
  (1 hour) on `/meta` and `/legislaturas`.
- Detail endpoints of `/iniciativas` and `/peticoes` also return a **weak
  ETag** — send it back as `If-None-Match` to get **304 Not Modified**.

## 5. Incremental sync

`/deputados`, `/iniciativas` and `/peticoes` accept **`updated_since`**,
returning only records whose `updatedAt` is at or after that instant.
Accepts `AAAA-MM-DD` or `AAAA-MM-DDTHH:MM:SSZ`.

## 6. Conventions

**Envelope.** Listing endpoints return `{ data, total, page, limit }`.
**`/legislaturas` is the documented exception** — a bare array, no envelope, no
pagination.

**Pagination.** `page` (default 1) and `limit` (default 50). Out-of-range values
are *clamped to the nearest bound*, not rejected — so a bad `page` silently
returns edge data rather than erroring. Don't rely on an error to catch it.

---

## 7. Endpoints

### Captured

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/meta` | Filter values: legislaturas, grupos, tipos, estados |
| `GET` | `/legislaturas` | All legislatures (bare array) |
| `GET` | `/legislaturas/{id}` | One legislature, with totals |
| `GET` | `/deputados` | List deputies |
| `GET` | `/deputados/carreiras` | Ranking by number of legislatures served |
| `GET` | `/deputados/{id}` | Deputy detail: mandates, bio, stats, 20 latest initiatives |
| `GET` | `/deputados/{id}/foto` | **302 redirect** to `cdn.openar.pt/fotos/{id}` |
| `GET` | `/deputados/{id}/atividade` | Full parliamentary activity |
| `GET` | `/iniciativas` | List legislative initiatives *(params captured; response truncated)* |

### Known to exist, NOT captured

| Path | Evidence |
|---|---|
| `/votacoes` | Referenced as `/votacoes?grupo=` in the `/meta` notes |
| `/peticoes` | Referenced in the caching and `updated_since` sections |
| `/comissoes` | Named in openAR's own dataset summary |

---

## 8. `GET /meta`

Returns legislaturas, parliamentary groups, initiative types and states present
in the database, ordered. **Use it to populate dropdowns instead of hardcoding.**

**Param:** `legislatura` (string) — filters `grupos` and `tipos` to that
legislature. `legislaturas` is always returned in full.

**Returns:** `legislaturas: string[]`, `grupos: string[]`, `tipos: object[]`,
`estados: string[]`.

> **Trap.** `grupos` is prefixed with five *institutional authors* —
> `Governo`, `PAR`, `Madeira`, `Açores`, `Mesa` — which are accepted **only** by
> `/iniciativas?grupo=` and `/votacoes?grupo=`, and are **rejected by
> `/deputados?grupo=`**. A single shared "group" dropdown wired to all three
> endpoints will produce 400s. Filter the list per endpoint.

## 9. `GET /legislaturas`

Bare array, ordered by start date ascending. No pagination, no envelope.

| Field | Type | Notes |
|---|---|---|
| `id` | string | `Constituinte`, or Roman numerals `I`–`XVII` |
| `nome` | string | |
| `dataInicio` | string \| null | |
| `dataFim` | string \| null | **null for the legislature in progress** |
| `arId` | string \| null | AR's internal numeric id (`DetalheLegislatura.id`) |
| `siglaAntiga` | string \| null | Sigla used in the source data |

`GET /legislaturas/{id}` returns the same fields plus totals (e.g.
`iniciativasTotal`). Errors: 429 (list), 400/404/429 (detail).

## 10. `GET /deputados`

**Params:** `legislatura`, `grupo` (sigla only — no institutional authors),
`q` (parliamentary name), `situacao`, `updated_since`, `sort` (`asc`/`desc`,
default `asc`), `page`, `limit`.

> `situacao=ativo` is a shortcut for *Efetivo + Efetivo Temporário + Efetivo
> Definitivo* — **the 230 sitting seats.** This is the filter for "current
> deputies".

**`data[]` fields:** `id`, `nomeParlamentar`, `nomeCompleto`,
`grupoParlamentar`, `circuloEleitoral`, `legislaturaId`, `situacao`,
`updatedAt`. Errors: 400, 429.

## 11. `GET /deputados/{id}`

`id` is **`DepCadId`**. Note the response also carries `depId` — *"identificador
interno distinto do DepCadId"*. **Two different deputy identifiers exist; do not
conflate them.**

Returns `mandatos`, `cargos`, `situacoes`, `bio`, `stats`, and the 20 most
recent authored `iniciativas`. `videos` is documented as *null in every record
to date* — do not build UI on it. Errors: 400, 404, 429.

## 12. `GET /deputados/{id}/foto`

**302 redirect** to the CDN, not image bytes — follow `Location` (browsers and
`<img>` do this automatically). **Existence is not checked:** an id with no
photo yields a 404 *from the CDN*, not from this API. Needs a fallback image.

## 13. `GET /deputados/{id}/atividade`

Full activity for a deputy, optionally scoped by `legislatura` (omit for all
history — potentially very large).

Returns ~18 parallel arrays: `iniciativas`, `requerimentos`, `intervencoes`,
`actp`, `comissoes`, `atividadesComissao`, `gpa`, `dlp`, `dle`, `relIni`,
`relPet`, `relContas`, `relIniEur`, `relPareceres`, `parlJovens`, `dadosLegis`,
`scgt`, plus `deputado`. Errors: 400, 404, 429.

## 14. `GET /iniciativas`

**Params:** `legislatura`, `tipo`, `estado` (repeatable), `grupo`, `resultado`,
`data_inicio`, `data_fim`, `deputado`, `q`, `updated_since`, `sort` (default
`desc`), `page`, `limit`.

**`tipo` codes:** `R` Resolução · `P` Proposta de Lei · `J` Projeto de Lei ·
`D` Decreto · `S` Outros · `A` Apreciação · `I` Iniciativa Europeia ·
`C` Pergunta/Requerimento · `F` Outros. Use `/meta` for the types actually
present.

**`resultado`:** `aprovado` (≥1 *Aprovado* vote) · `rejeitado` (≥1 *Rejeitado*
vote) · `pendente` (no votes recorded).

**`deputado`** accepts a numeric id *or* a partial, case-insensitive
parliamentary name.

**Deprecated:** `dataEntradaDe` / `dataEntradaAte` — use `data_inicio` /
`data_fim`. The old names are **silently ignored** when the new ones are
present. Do not use them.

> **The most important trap in this document.** `estado` is *"a fase actual do
> processo, não um veredicto"* — the current procedural stage, not an outcome.
> **`Aprovado` is not a valid `estado`.** To find approved initiatives use
> `resultado=aprovado`. Exact values live in `/meta → estados`. Getting this
> wrong yields a filter that silently returns nothing.

**Response:** truncated in the capture — envelope shape only.

---

## 15. Implications for this extension

Recorded here so they survive into design (see `PLAN.md` P2):

1. **`/meta` is a startup dependency.** It supplies every dropdown, and is
   cacheable for an hour. Fetch once, cache, reuse.
2. **Per-endpoint group lists** — the institutional-author split (§8) means
   there is no single reusable "group" filter component.
3. **Debounce all search.** 100 req/min dies fast under type-ahead.
4. **Honour `Retry-After` on 429.** It's an error case on every endpoint.
5. **ETags on detail views** give cheap 304s — worth wiring into the client
   from the start rather than retrofitting.
6. **Two deputy identifiers** (`DepCadId` vs `depId`) — model this explicitly in
   types so they cannot be swapped by accident.
7. **Photos need a fallback** — the CDN 404s for deputies without one.
8. **`dataFim: null` marks the current legislature** — that's how to resolve
   "now" without hardcoding `XVII`.
