# openAR API reference

Human-readable companion to the complete OpenAPI 3.1 spec (`info.version`
0.1.0), published live at `https://api.openar.pt/openapi.json`. The spec is
no longer committed: `docs/` is gitignored in full (D111). Fetch a working
copy when the prose here is ambiguous:

```bash
mkdir -p docs && curl -s https://api.openar.pt/openapi.json -o docs/openar-openapi.json
```

**The JSON is the source of truth.** This file exists to surface the traps that
a schema alone doesn't make obvious. Where they disagree, the JSON wins.

> **Status: complete.** All 16 endpoints are documented, plus a 17th
> (`/deputados/{id}/intervencoes`) that appeared later and is listed but not
> used. This supersedes the
> earlier partial capture transcribed from a truncated PDF — which, among other
> things, had the base URL wrong (§1).

---

## 1. Basics

| | |
|---|---|
| **Base URL** | **`https://api.openar.pt/v1`** |
| Local dev server | `http://localhost:3000/v1` |
| Spec | `https://api.openar.pt/openapi.json` (not committed; `docs/` is gitignored) |
| **Licence** | **MIT** (`https://opensource.org/licenses/MIT`) |
| Contact | `https://openar.pt` |
| Auth | **None.** All endpoints public. |
| Methods | `GET`, `HEAD`, `OPTIONS` only |
| Source | AR *dados abertos* programme, **updated daily** |
| CDN | `cdn.openar.pt` (deputy photos) |

> ### ⚠️ The base URL carries a `/v1` prefix
> Every path below is relative to **`https://api.openar.pt/v1`**, not
> `https://api.openar.pt`. The reference *page* lists paths as `/meta`,
> `/votacoes` and so on with no prefix, which is misleading — the prefix lives
> in `servers[0].url`. Building the client against the bare host would 404 on
> every single call.

> **Licensing is resolved: MIT.** This was an open question blocking publish
> (P5). MIT permits redistribution with attribution, so surfacing this data in
> a Raycast extension is fine. Credit openAR in the README and the store listing.

## 2. Rate limits

**100 requests per minute per IP**, sliding window. Every response carries
`X-RateLimit-Limit` and `X-RateLimit-Remaining`. Exceeding it returns **429**
with `Retry-After: <seconds>`.

> **The spec's per-endpoint error lists are incomplete.** `/meta` documents no
> errors at all and `/legislaturas/{id}` omits `429`, but the rate limit is
> global — described in `info.description`, not per-path. Treat **429 as
> possible on every call** regardless of what a path's `responses` object lists.

## 3. Input limits

- Query string: **max 500 characters**
- `q`: **max 100 characters** (`maxLength` in the schema)

Both return **400**. Validate client-side.

## 4. Caching

- `Cache-Control` on everything: `max-age=300`, or **3600** on `/meta` and
  `/legislaturas`.
- `/iniciativas/{id}` and `/peticoes/{id}` return a **weak `ETag`** derived from
  `updatedAt`. Send it as `If-None-Match` → **304**, no body.

## 5. Incremental sync

`/deputados`, `/iniciativas` and `/peticoes` accept **`updated_since`**
(`AAAA-MM-DD` or `AAAA-MM-DDTHH:MM:SSZ`), returning only records whose
`updatedAt` is at or after that instant.

## 6. Shared conventions

**Envelope.** Listings return `{ data, total, page, limit }`.
**`/legislaturas` is the sole exception** — a bare array, no envelope, no
pagination.

**Pagination.** `page` (default 1, min 1) · `limit` (default 50, min 1,
**max 200**). Out-of-range values are **clamped, not rejected** — a bad `page`
silently returns edge data rather than erroring.

**Sort defaults differ.** `sortNome` (`/deputados`, `/comissoes`) defaults to
**`asc`** (alphabetical); everything else defaults to **`desc`** (newest first).

**Dates.** `data_inicio` / `data_fim`, inclusive, `AAAA-MM-DD`.

---

## 7. Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/meta` | Filter values — legislaturas, grupos, tipos, estados |
| `GET` | `/legislaturas` | All legislatures (bare array) |
| `GET` | `/legislaturas/{id}` | One legislature + totals |
| `GET` | `/deputados` | List deputies |
| `GET` | `/deputados/carreiras` | Ranking by legislatures served |
| `GET` | `/deputados/{id}` | Deputy detail (supports `include`, **required**: see §9) |
| `GET` | `/deputados/{id}/foto` | 302 → CDN photo |
| `GET` | `/deputados/{id}/atividade` | Full parliamentary activity (supports `include`; omitting it returns every section) |
| `GET` | `/deputados/{id}/intervencoes` | A deputy's plenary interventions, paginated. Added after the client was written; unused |
| `GET` | `/iniciativas` | List initiatives |
| `GET` | `/iniciativas/{id}` | Initiative detail (supports `include`) |
| `GET` | `/votacoes` | **List plenary votes** |
| `GET` | `/votacoes/{id}` | One vote (**requires `iniciativa_id`**) |
| `GET` | `/peticoes` | List petitions |
| `GET` | `/peticoes/{id}` | Petition detail (supports `include`) |
| `GET` | `/comissoes` | List committees |
| `GET` | `/comissoes/{id}` | Committee + its initiatives (supports `include` for per-initiative relations; omitting it returns the summary) |

---

## 8. `/votacoes` — the one that matters

Backs `browse-votes`.

**Params:** `legislatura`, `resultado`, `unanime`, `iniciativa` (IniId), `tipo`,
`grupo`, `a_favor`, `contra`, `abstencao`, `data_inicio`, `data_fim`, `sort`
(default `desc`), `page`, `limit`.

`a_favor` / `contra` / `abstencao` each take a party sigla and filter to votes
where that party voted that way — so "how did IL vote on things it abstained
on" is one request, no client-side filtering.

**Response** is `PaginatedVotacoes`; each item is a `Votacao` **plus** initiative
metadata (`iniciativaId`, `iniciativaTitulo`, `iniciativaNumero`,
`iniciativaTipo`, `legislaturaId`) — so a vote list renders titles without a
second call. That is what makes the day's-votes command a single request.

### `Votacao`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **Not globally unique** — see below |
| `data` | date \| null | |
| `resultado` | enum | `Aprovado` · `Rejeitado` · `Prejudicado` |
| `unanime` | boolean | |
| `reuniao` | string \| null | |
| `tipoReuniao` | string \| null | e.g. `RP` |
| `descricao` | string \| null | |
| `aFavor` | string[] | Party siglas voting in favour |
| `contra` | string[] | |
| `abstencao` | string[] | |
| `ausencias` | string[] | |
| `detalhe` | string \| null | **Raw AR HTML** the three arrays are parsed from. For roll-call votes it names individual deputies. |

> ### ⚠️ Vote ids are unique per initiative, not globally
> `/votacoes/{id}` **requires** an `iniciativa_id` query parameter — the spec
> says so outright. Missing or non-numeric returns 400. So a vote's identity is
> the **pair** `(id, iniciativaId)`. Model it as a compound key; a bare `id`
> passed between views will not resolve.

> ### ⚠️ `resultado` casing is inconsistent between endpoints
> `/votacoes?resultado=` takes **`Aprovado`** — capitalised, and the spec says
> *"correspondência exacta, sensível a maiúsculas"*.
> `/iniciativas?resultado=` takes **`aprovado`** — lowercase.
> Same concept, different casing, on sibling endpoints. Wrap both in typed
> constants rather than passing raw strings.

> `unanime` accepts only `true`/`false`/`1`/`0` as strings. **Anything else is a
> 400**, so don't forward a raw boolean-ish value.

---

## 9. `include=` on detail endpoints

`/iniciativas/{id}` and `/peticoes/{id}` accept a comma-separated `include`.

**Omitting `include` returns everything.** The spec warns that for old,
heavily-debated initiatives this reaches **hundreds of KB**. In a launcher
extension that is a real latency cost — always pass `include` explicitly.

**`/iniciativas/{id}` top-level relations:** `autores`, `eventos`,
`relacionadas`, `anexos`, `conjuntas`, `peticoes`, `propostasAlteracao`.

**`eventos` sub-relations:** `eventos.votacoes`, `eventos.publicacoes`,
`eventos.comissoesFases`, `eventos.intervencoesdebates`,
`eventos.iniciativasConjuntas`, `eventos.peticoesConjuntas`, `eventos.anexos`.

Rules worth knowing:
- Requesting `eventos` pulls **all** its sub-relations.
- Requesting any sub-relation pulls `eventos` automatically.
- Short forms work (`votacoes` ≡ `eventos.votacoes`) — **except `eventos.anexos`**,
  because bare `anexos` always means the top-level relation.
- `?include=` (empty) returns scalar fields only.
- An unknown key returns **400 with the list of valid keys**.
- `intervencoesdebates` is flagged as the heaviest relation — opt in deliberately.

### `/deputados/{id}` works the other way round

Found on 2026-11-02, the first time the client ran against the live API.
`/deputados/{id}` gained an `include` parameter after the client was written,
and **omitting it returns only the scalar fields**: no `mandatos`, `bio`,
`stats` or `iniciativas`. The spec's own wording: *"Omitir devolve só os campos
escalares."* The keys are `mandatos`, `cargos`, `situacoes`, `bio`, `stats`,
`iniciativas`, and `*` for all of them.

This is the opposite of `/iniciativas/{id}`, where omitting `include` returns
everything. The rule that holds for both is the one in §16: **always send
`include`**. Here it is needed to get the data at all, not just to keep the
payload small. The spec's `info.version` stayed at `0.1.0` through the change,
so the version number does not reveal it.

`/peticoes/{id}` works identically: top-level `comissoes`, `documentos`,
`publicacoes`, `relacionadas`; `comissoes.*` sub-relations with the same
short-form rule, `comissoes.documentos` being the exception.

---

## 10. `/meta`

Populates every dropdown. Returns `legislaturas: string[]`, `grupos: string[]`,
`tipos: {tipo, tipoDesc}[]`, `estados: string[]`. Optional `legislatura` filters
`grupos` and `tipos`; `legislaturas` always comes back whole.

> ### ⚠️ `grupos` mixes parties with institutional authors
> The array is prefixed with `Governo`, `PAR`, `Madeira`, `Açores`, `Mesa`.
> Those five are accepted by **`/iniciativas?grupo=` and `/votacoes?grupo=`**
> but **rejected by `/deputados?grupo=`**. One shared group dropdown wired to
> all three produces 400s. Filter per endpoint.

Example values: `Governo`, `PAR`, `Madeira`, `Açores`, `Mesa`, `BE`, `CH`,
`CDS-PP`, `IL`, `L`, `PAN`, `PCP`, `PS`, `PSD`.

## 11. `/legislaturas`

Bare array, oldest → newest. Fields: `id` (`Constituinte` or `I`–`XVII`),
`nome`, `dataInicio`, `dataFim`, `arId`, `siglaAntiga`.

**`dataFim: null` marks the legislature in progress** — that's how to resolve
"current" without hardcoding `XVII`.

`/legislaturas/{id}` adds `iniciativasTotal`, `deputadosTotal`, `votacoesTotal`.

## 12. `/deputados`

**Params:** `legislatura`, `grupo` (sigla only), `q`, `situacao`,
`updated_since`, `sort` (default `asc`), `page`, `limit`.

`situacao=ativo` is a shortcut for *Efetivo + Efetivo Temporário + Efetivo
Definitivo*. **It means the 230 sitting seats only together with the current
`legislatura`.** On its own it matches everyone who ever held such a seat:
2,306 rows on 2026-11-02, retired deputies included, each shown with their most
recent matching mandate (see deduplication below).

**Deduplication:** *"Um deputado aparece uma só vez, com os dados do mandato
mais recente que corresponde aos filtros."* One row per person, not per mandate.

**`Deputado`:** `id`, `nomeParlamentar`, `nomeCompleto`, `grupoParlamentar`,
`circuloEleitoral`, `legislaturaId`, `situacao`, `updatedAt`.

### `/deputados/{id}`

> **Two deputy identifiers.** The path `id` is `DepCadId`; the response also
> carries `depId`, *"identificador interno distinto do DepCadId"*. Model them as
> distinct types — they are not interchangeable.

Returns `mandatos`, `cargos`, `situacoes`, `bio`, `stats`, and the 20 most
recent authored `iniciativas`, **but only the ones named in `include`**.
Without it the response has the scalar fields alone (§9).

`bio.legislaturas[].partidoSigla` is the **electoral party or coalition**
(e.g. `PPD/PSD.CDS-PP`) and is **distinct from the parliamentary group** in
`mandatos[].grupoParlamentar`. Don't treat them as the same field.

`videos` is documented as *null in every record to date* — don't build on it.

### `/deputados/{id}/foto`

**302 → CDN**, not image bytes. Existence is **not** checked: an id with no
photo 404s *at the CDN*. Needs a fallback image.

### `/deputados/carreiras`

Ranking by distinct legislatures served, `Suplente` mandates excluded. Returns
`data[]` (`totalLegs`, `firstLegStart`, `lastLegStart`, `lastParty`, `legIds`)
plus `stats` aggregated over **all** deputies, not just the returned page.

## 13. `/iniciativas`

**Params:** `legislatura`, `tipo`, `estado` (repeatable), `grupo`, `resultado`,
`data_inicio`, `data_fim`, `deputado`, `q`, `updated_since`, `sort`, `page`,
`limit`.

**`tipo`:** `R` Resolução · `P` Proposta de Lei · `J` Projeto de Lei ·
`D` Decreto · `S` Outros · `A` Apreciação · `I` Iniciativa Europeia ·
`C` Pergunta/Requerimento · `F` Outros.

**`resultado`:** `aprovado` (≥1 Aprovado vote) · `rejeitado` · `pendente` (no
votes recorded).

**`deputado`** takes a numeric id *or* a partial case-insensitive name.

**Deprecated:** `dataEntradaDe` / `dataEntradaAte` — **silently ignored** when
`data_inicio` / `data_fim` are present. Never use them.

> ### ⚠️ `estado` is a stage, not a verdict
> *"Fase actual do processo, não um veredicto."* **`Aprovado` is not a valid
> `estado`.** For approval use `resultado=aprovado`. Exact values live in
> `/meta → estados`. Getting this wrong yields a filter that silently matches
> nothing. `Iniciativa.estado` carries the same caveat: *"Fase do último evento
> registado — não é um veredicto de aprovação."*

`estado` is `style: form, explode: true` — repeat the key for multiple values
(`?estado=A&estado=B`), don't comma-join.

## 14. `/comissoes`

`/comissoes` returns the canonical committee table with a **stable numeric
`id`** — resolve a name to an id here first. `/comissoes/{id}` then returns the
committee plus a paginated list of initiatives that passed through it, each with
its `comissoesFases` (relatores, votações, documentos, audições, remessas,
publicações).

> **Schema migration, dated.** `PeticaoComissao.comissaoId` is now an FK into
> `/comissoes`; *before 2026-07* that field held the source code, which is now
> `comissaoCodigo`. Any cached or third-party data older than that has the old
> meaning.

## 15. `/peticoes`

**Params:** `legislatura`, `situacao` (e.g. `Admitida`, `Arquivada`), `q`,
`data_inicio`, `data_fim`, `updated_since`, `sort`, `page`, `limit`.

`Peticao` carries `assunto`, `autor`, `assinaturas` / `assinaturasInicial`,
`dataDebate`, `urlTexto`. Detail adds `comissoes` (with `relatorioFinal`
including its own vote breakdown), `documentos`, `publicacoes`, `relacionadas`.

---

## 16. Implications for the extension

Feed these into P2 (client design):

1. **`/v1` in the base URL.** Non-negotiable, and the single easiest thing to
   get wrong.
2. **`/meta` is a startup dependency** — every dropdown, cacheable an hour.
3. **Per-endpoint group lists** (§10) — no single shared group filter.
4. **Compound key for votes** — `(id, iniciativaId)`, always.
5. **Typed constants for `resultado`** — the casing differs per endpoint (§8).
6. **Always send `include`** on detail calls, or pay hundreds of KB, or, on
   `/deputados/{id}`, get no relations at all (§9).
7. **Debounce search; honour `Retry-After`.** 100/min dies under type-ahead.
8. **Wire ETags early** on the two detail endpoints — cheap 304s.
9. **Two deputy ids**, and party ≠ parliamentary group (§12).
10. **Photo fallback** for deputies with no CDN image.
11. **`dataFim: null`** resolves the current legislature.
12. **`limit` caps at 200**, and out-of-range paging is clamped silently.
13. **MIT licence** — attribute openAR in README and store listing.
