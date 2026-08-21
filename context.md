# context.md — project state and knowledge

What we know: what we're building, every decision taken, what's blocked, and
what the audit found. This is the **living record** — append to it as we go.

Companion documents:

| File | Holds | Read it when |
|---|---|---|
| **`CLAUDE.md`** | *How we work* — the standing rules (R1–R6), architecture conventions, test mechanics | Start of every session |
| **`context.md`** (this file) | *What we know* — project context, decision log, open questions, blockers, audit findings | Before proposing anything |
| **`PLAN.md`** | *What we do next* — forward-only, undone work exclusively | When picking up work |
| **`OPENAR-API.md`** | *What the API does* — the openAR contract and its traps | Before writing any client code |
| **`docs/openar-openapi.json`** | The full OpenAPI 3.1 spec — source of truth | When the prose is ambiguous |

Decisions are append-only: add, don't rewrite. All of these are tracked in
git (D14/D18) — the repo is **private**, so internal working notes are fine here.
Keep credentials out regardless.

- **Repo:** `caasols/raycast-assembleia-da-republica` (private)
- **State:** feature-complete for v1. The 2026-08-20 audit's P0 defect is
  fixed and its whole remediation track (PLAN C1–C11) has landed; everything
  still outstanding needs the author's machine (§3)
- **Reference implementation:** [`caasols/raycast-buzz`](https://github.com/caasols/raycast-buzz)
- **Last updated:** 2026-08-21

---

## 1. What we're building

A Raycast extension that puts the Portuguese parliament in the Raycast launcher,
backed by **openAR** — an open, free, unauthenticated API over Assembleia da
República data.

The value proposition: parliamentary data in Portugal is public but awkward to
reach. The official portal publishes bulk XML/JSON dumps rather than a
query-friendly API. openAR already did the normalisation work. Raycast is a good
surface for the "quick lookup" shape of question this data answers — *what was
voted today, how did this party vote, who is this deputy* — which today means
opening a browser and navigating a portal.

**Scope for v1: read-only lookups.** No accounts, no writes, no notifications.

### 1.1 What exists today

Moved here from `PLAN.md`, which holds only undone work. Seven commands, each
opening a detail view rather than dead-ending (D66):

| Command | Endpoint |
|---|---|
| `Browse Today's Votes` | `/votacoes`, filtered to the current Lisbon date |
| `Search Initiatives` | `/iniciativas` |
| `Browse Party Votes` | `/votacoes`, one position filter per query (`positionFilter`, D103) |
| `Search Petitions` | `/peticoes` |
| `Browse Deputies` | `/deputados?situacao=ativo` |
| `Browse Committees` | `/comissoes` |
| `Browse Longest-Serving Deputies` | `/deputados/carreiras` |

Five detail views — initiative, deputy, deputy activity, committee, petition.
**Nine AI tools** in `src/tools/` (D88). `src/lib/` carries the client (13
endpoints), query building, pagination — including `loadListPage`, the one
paginated-fetch wrapper every scrolling list uses — preferences, errors, the
ETag store, the shared detail-state markdown and the per-entity presentation
helpers. Every command filters by legislature, back to 1976, with page size
and default legislature as preferences.

**525 tests across 43 files at 100% coverage** and an **88.0% mutation score
with every survivor explained** (§6.2), green in CI on GitHub's runners —
verified, not assumed (D92, D94). The extension icon is the AR's own mark
(D96). The audit remediation lives on the working branch, ahead of `main`.

---

## 2. Decisions log

`[inferred]` marks a decision read out of the code or git history rather than
stated explicitly — correct these rather than inherit them as fact.

| # | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D1 | 2026-08-18 | Raycast extension, TypeScript, official `ray` toolchain | Scaffolded from the standard Raycast template | Settled `[inferred]` |
| D2 | 2026-08-18 | Ship on **Windows and macOS** | `platforms` in `package.json`. Note raycast-buzz is macOS-only — see O5 | Settled `[inferred]` |
| D3 | 2026-08-18 | **MIT** license | `LICENSE`, `package.json` | Settled `[inferred]` |
| D4 | 2026-08-18 | Category **Data**; author `caasols` | `package.json` | Settled `[inferred]` |
| D5 | 2026-08-18 | Adopt the `.gitignore` baseline from raycast-buzz | Reuse a known-good ignore set (commit `eef5791`) | Settled |
| D6 | 2026-08-18 | Internal working docs stay **out of the public repo** | Keep scratch notes unpublished (commit `eef5791`) | Settled |
| D7 | 2026-08-18 | First command is `what-was-the-vote-today` | `package.json` | Settled `[inferred]` |
| D8 | 2026-08-18 | `context.md` stays gitignored and uncommitted | Clean public repo judged more important than durability | **Superseded by D9** |
| D9 | 2026-08-18 | Project tracking moves to **`PLAN.md`**, which **is** committed; `context.md` is retired | A decision log that dies with the dev container isn't a log. `PLAN.md` is not in `.gitignore`, so it versions and diffs like code. Content folded in from `context.md`. | **Partially superseded by D15** |
| D10 | 2026-08-18 | Data source is **openAR** (`api.openar.pt`), not the raw parlamento.pt dumps | openAR normalises the official bulk XML/JSON into a queryable API and needs no auth. Consuming raw dumps would mean shipping a parser and a sync story inside a launcher extension. | Settled |
| D11 | 2026-08-18 | **Mirror raycast-buzz's structure and test strategy wholesale** | It already solves the hard parts: stubbing `@raycast/api` under vitest, split tsconfigs, 100% coverage thresholds, `lib`/`components`/command split. Divergence costs more than it buys. | Settled |
| D12 | 2026-08-18 | Working rules captured in `CLAUDE.md` | Per user request; see `CLAUDE.md` R1–R6 | Settled |
| D13 | 2026-08-18 | `caasols/raycast-buzz` — **not** `block/buzz` — is the Raycast reference | `block/buzz` is the Buzz *product*: a Rust workspace (~20 crates) plus desktop/mobile/web, with zero `@raycast/api` anywhere. It is the backend the extension talks to. Useful only for contributor-guide/testing conventions. | Settled |
| D14 | 2026-08-18 | **`CLAUDE.md` and `context.md` are now tracked in git** | Supersedes D6/D8 for these two files. User asked for them in the GitHub repo. Removed from `.gitignore`; `docs/` and `PROJECT_BRIEF.md` stay ignored. Neither contains secrets. | Settled |
| D15 | 2026-08-18 | **Three tracked docs with separate jobs:** `CLAUDE.md` (how we work) / `context.md` (what we know) / `PLAN.md` (what we do next). Partially reverses D9 — `context.md` is restored rather than retired. | The user works from a `CLAUDE.md` + `context.md` pair and needs both present to build on as we go. Splitting state from forward-plan keeps one source of truth per question instead of duplicating decisions across two files. | Settled |
| D16 | 2026-08-18 | Internal working docs live in the repo | **The repo is private** — checked, not assumed. D6's premise ("never published to the public repo") was simply wrong: there is no public repo. Nothing here is secret-bearing anyway. | Settled |
| D17 | 2026-08-18 | **Vendor the openAR API reference into the repo** as `OPENAR-API.md` | The live spec is unreachable from dev containers, so the contract is transcribed from the official reference PDF and committed. Makes the API contract reviewable in diffs and unblocks every future session. Capture is **partial** — see O8. | Settled |
| D18 | 2026-08-18 | **Vendor the full OpenAPI spec** as `docs/openar-openapi.json`; `OPENAR-API.md` rewritten from it | The complete 3.1 spec was supplied directly. 16 endpoints, all schemas. `.gitignore` narrowed from `docs/` to `docs/*` + a negation so the spec tracks while scratch docs stay ignored. Closes O8. | Settled |
| D19 | 2026-08-18 | **Base URL is `https://api.openar.pt/v1`** | `servers[0].url` in the spec. The reference page lists paths without the prefix, which is misleading — the earlier vendored doc had it wrong. Every call against the bare host would 404. | Settled |
| D20 | 2026-08-18 | openAR is **MIT licensed**; attribute it in README and store listing | `info.license` in the spec. Resolves the licensing question that blocked P5. Redistribution is permitted with attribution. | Settled |
| D21 | 2026-08-18 | Command mode is **`view`** (closes O2) | A `no-view` command can only raise a HUD or toast, which cannot render a list of votes. File is now `.tsx`. | Settled |
| D22 | 2026-08-18 | Target the **Raycast Store** (closes O3) | Keeps P5 in the roadmap and makes the manifest/README/screenshot rules binding. | Settled |
| D23 | 2026-08-18 | Ship on **Windows and macOS** (closes O5) | Confirms D2. Consequence: no macOS-only APIs, and manual test surface doubles. raycast-buzz is macOS-only, so it is not a guide here. | Settled |
| D24 | 2026-08-18 | Extension slug is **`assembleia-da-republica`** | Was `assembleia-da-rep-blica` — the `ú` was dropped, not transliterated. Permanent once published, so fixed before any publish. | Settled |
| D25 | 2026-08-18 | Extension title stays **`Assembleia da República`**, accepting a `ray lint` Title-Case warning | It is the institution's proper name; `Assembleia Da República` is wrong Portuguese. A warning, not an error. Revisit if store review objects — see O9. | Settled |
| D26 | 2026-08-18 | CI runs `eslint src` + `prettier --check`, **not** `ray lint` | `ray lint` validates the author against raycast.com, which would make CI depend on that service. The other `ray lint` checks (ESLint, Prettier, icons) are covered directly. | Settled |
| D27 | 2026-08-18 | `.prettierignore` covers `docs/` and `*.md` | The vendored spec must not be reformatted or diffs against a refreshed spec become unreadable; prose docs are hand-formatted and Prettier's reflow fights the tables. | Settled |
| D28 | 2026-08-18 | **English UI copy, Portuguese `keywords`** (closes O6) | `caasols/raycast-publico` already established this and its README states it outright: *"section names are English, and typing `desporto` or `saúde` still finds Sports and Health."* Keywords carry both accented and unaccented Portuguese so search works either way. | Settled |
| D29 | 2026-08-18 | **CI runs `ray lint` after all** — reverses D26 | raycast-publico's CI runs `npm run lint` in GitHub Actions successfully. The author-validation failure was the dev container's egress block, not a CI limitation. `ray lint` also validates the manifest and icons, which ESLint and Prettier cannot see. | Settled |
| D30 | 2026-08-18 | Command titles follow raycast-publico's **`Browse X`** house style | `Browse Today's Votes`, not `What Was the Vote Today`. Command `name` stays `what-was-the-vote-today` (D7) — publico also has titles that differ from their command names (`view-popular-news` → `Browse Popular News`). | Settled |
| D31 | 2026-08-18 | CI pins **Node 24**, `checkout@v7` / `setup-node@v7` | Matches raycast-publico. `@raycast/api` declares `engines.node >=22.22.2` (verified), so older Node validates a configuration Raycast does not support. | Settled |
| D32 | 2026-08-18 | Tests stay **colocated** (`src/lib/x.test.ts`), per raycast-buzz | raycast-publico uses `src/__tests__/` instead — the two reference repos disagree. D11 already chose buzz, colocation keeps a module and its test adjacent, and P0 is already built this way. Noted so the divergence is deliberate rather than accidental. | Settled |
| D33 | 2026-08-18 | **Hand-write the client and its types**, not generate from the OpenAPI spec | Both reference extensions hand-write theirs with runtime validation. The extension touches a few of the spec's 16 endpoints, so generated types for all of them are dead weight — and the traps worth encoding (compound vote key, per-endpoint `resultado` casing) are exactly what a generator flattens. The spec stays the source of truth. | Settled |
| D34 | 2026-08-18 | Client is **module functions over `fetch`**, not a class | openAR needs no auth, so there is no per-instance state a class would hold. Matches raycast-publico; raycast-buzz uses a class only because it carries a relay URL and a signing key. | Settled |
| D35 | 2026-08-18 | Commands drive the client through **`usePromise`/`useCachedPromise`**, not `useFetch` | Keeps request building, clamping, the 429 contract and envelope validation in one testable place rather than spread across hooks in views. Matches `CLAUDE.md`'s "no `fetch` in commands" rule. | Settled |
| D36 | 2026-08-18 | **Clamp `page`/`limit` client-side** even though the API clamps server-side | openAR adjusts out-of-range values to the nearest bound rather than erroring, so a bad value silently returns edge data. Clamping keeps the request we sent and the data we got describing the same thing. raycast-publico found the same need against Público's API. | Settled |
| D37 | 2026-08-18 | **Envelope validation is shallow** — `data` is an array, nothing deeper | Re-validating every field of every row would be a second copy of the schema, drifting from the vendored spec. A row with missing fields renders with gaps; a non-array `data` throws inside `.map` far from the cause, which is the failure worth catching. | Settled |
| D38 | 2026-08-18 | **Plenary votes only** for this command (closes the committee half of O4) | Settled by the API rather than by preference: `/votacoes` is documented as *"Listar votações em plenário"*. Committee votes live inside an initiative's `comissoesFases`, so surfacing them is a different command, not a filter on this one. | Settled |
| D39 | 2026-08-18 | **"Today" means today in `Europe/Lisbon`**, not on the user's machine | Parliament sits in Lisbon. Deriving the date from the local clock shows the wrong sitting day, or an empty list, for anyone far enough east or west — a silent wrong answer rather than an error. | Settled |
| D40 | 2026-08-18 | **Never render openAR's `detalhe` field** | It is unsanitised AR HTML from a third party. It names individual deputies on roll-call votes, which is genuinely useful, but Raycast's markdown renderer is not where to discover what else it contains. Revisit only with real sanitising. | Settled |
| D41 | 2026-08-18 | Empty, failed and rate-limited states are **three distinct views** | A quiet day and a broken request both produce no rows; saying "no votes today" when the request failed is a lie the user cannot see through. Rate limiting is separated again because waiting genuinely fixes it and the API says for how long. | Settled |
| D42 | 2026-08-18 | Extend the stub rather than weaken assertions | `List.Item.Detail` was missing, and `iconAttr` stringified the `{source, tintColor}` form to `[object Object]`, which no test could assert on. Both fixed in `test/raycast-api-stub.tsx`, per `CLAUDE.md` §3. | Settled |
| D43 | 2026-08-18 | Second command is **`Search Initiatives`** (`/iniciativas`) | Largest dataset, the only one with useful free-text search, and it reuses the client untouched. Exercises the `q` truncation and throttling the client was built for. | Settled |
| D44 | 2026-08-18 | Search runs **server-side and throttled**, with native filtering off | The corpus spans every legislature since 1976, so no useful subset fits locally. `throttle` is load-bearing rather than cosmetic: a request per keystroke would exhaust the 100/min budget in seconds. | Settled |
| D45 | 2026-08-18 | Extract **`components/request-empty-view.tsx`** on its second use | P4's own rule. Every openAR-backed list has the same three ways of showing nothing — failed, rate limited, genuinely empty — and the distinction now lives in one place. Cost: the error title is shared copy ("Could not reach openAR") rather than per-command wording. | Settled |
| D46 | 2026-08-18 | `estado` is labelled **"Stage"** in the UI, never "Result" | The spec is explicit that it is the phase of the last recorded event and not a verdict, and `Aprovado` is not among its values. Calling it a result would invite the exact misreading the API documentation warns about. | Settled |
| D47 | 2026-08-18 | **Empty search is a valid request**, not a blank screen | `/iniciativas` with no `q` returns the most recent initiatives, which is a better landing state than nothing. A whitespace-only query is treated as no query rather than a search for spaces. | Settled |
| D48 | 2026-08-18 | Five more commands: **Party Votes, Petitions, Deputies, Committees, Longest-Serving** | Every one is backed by a named endpoint from the vendored spec. Seven commands total. | Settled |
| D49 | 2026-08-18 | **Party dropdowns are built per endpoint, not shared** | `/votacoes?grupo=` accepts the five institutional authors; `/deputados?grupo=` rejects them. `parliamentaryGroups()` filters them out, and only the deputies command uses it. A single shared dropdown would have produced 400s on one of the two. | Settled |
| D50 | 2026-08-18 | Party filtering uses **the API's own `a_favor`/`contra`/`abstencao`** | One request per query instead of downloading the archive and filtering locally — which the 100 req/min limit would not survive anyway. | Settled |
| D51 | 2026-08-18 | Extract **`components/vote-result-icon.ts`** on its second use | Duplicated the moment Browse Party Votes needed the same result→colour mapping. Lives under `components/` rather than `lib/` because it maps onto Raycast's own `Icon`/`Color` and is purely presentational. | Settled |
| D52 | 2026-08-18 | Deputy photos always carry a **fallback icon** | `/deputados/{id}/foto` 302s to a CDN that 404s when no photo exists, and existence is not checked server-side. Without the fallback those rows render broken. | Settled |
| D53 | 2026-08-18 | Stub gained **`Cache`** and **`List.Dropdown`** | `useCachedPromise` constructs `Cache` on mount, so without it every command using that hook died before rendering. Its methods are arrow properties because the hook calls them detached. `List.Dropdown` renders a real `<select>` so tests change it the way a user would. | Settled |
| D54 | 2026-08-18 | **Do not extract a shared dropdown component**; extract `components/use-parties.ts` instead | The two dropdowns are not the same thing — one is flat (`value = sigla`), the other sectioned with composite `sigla\|position` values and different placeholder copy. A component covering both would take more configuration than the markup it saves. What *is* genuinely duplicated is fetching `/meta` and picking the right party list, and that is where the D49 trap lives. | Settled |
| D55 | 2026-08-18 | `useParties(scope)` takes an explicit **`"authors"` / `"members"`** scope | Makes the D49 trap a decision the caller must state rather than one they fall into by reaching for `meta.grupos`. `authors` for `/iniciativas` and `/votacoes`; `members` for `/deputados`, which 400s on the institutional five. | Settled |
| D56 | 2026-08-18 | `useParties` returns **`[]` on failure**, it does not throw | A dropdown that is briefly empty degrades to "no filter available"; one that throws takes the whole command down over a filter, while the list itself would still have rendered. | Settled |
| D57 | 2026-08-18 | Stub serialises an icon's **`fallback`**, and exposes `__resetCaches()` | The photo fallback was implemented but unassertable, so the test could not prove the CDN-404 case was covered. `__resetCaches` is needed because `@raycast/utils` holds a module-level `Cache`, which leaked values between tests. Imported from the stub path directly, as raycast-buzz does with `__resetLocalStorage`. | Settled |
| D58 | 2026-08-18 | **Detail views are `components/`, not root commands** | `InitiativeDetail` is reachable from three lists — both vote commands carry `iniciativaId` on every row, and Search Initiatives has the initiative itself. A root command would need its own manifest entry and a way to pick a target; a pushed component is reached from wherever the user already is. | Settled |
| D59 | 2026-08-18 | **`include` is always sent explicitly** on `/iniciativas/{id}` | `INICIATIVA_INCLUDE = "autores,eventos.votacoes,eventos.publicacoes"`. Omitting it returns every relation including debate transcripts — hundreds of KB for an old initiative, a visible stall in a launcher. The cost is opted into, never inherited. A test pins that the parameter is always present. | Settled |
| D60 | 2026-08-18 | Pushed views **open with the title the caller already had** | The list knows the initiative's title and the deputy's name, so the detail pane renders it immediately and fills in as the request lands, rather than showing a blank frame. The same title is kept in the error state, so a failure reads as "this thing failed to load" rather than as a bare error. | Settled |
| D61 | 2026-08-18 | `CommitteeDetail` is a **`List`, not a `Detail`** | `/comissoes/{id}` returns a paginated collection with the committee's metadata alongside it, so it is another navigable level rather than a leaf — and its rows push further into `InitiativeDetail`. Its envelope also sits beside the metadata rather than wrapping it, so it cannot reuse `asPaginated`. | Settled |
| D62 | 2026-08-18 | **Pagination via Raycast's built-in `List.pagination`**, not a "Load More" row | Raycast calls `onLoadMore` when the user scrolls to the bottom, so the list extends by scrolling like every other Raycast extension, and a manual row would be a second, worse mechanism sitting next to it. | Settled |
| D63 | 2026-08-18 | **`toApiPage` / `hasMorePages` live in `lib/pagination.ts`** with tests | Raycast's `page` is zero-based; openAR's has `minimum: 1`. Passing Raycast's index straight through requests page 0, which openAR *clamps up to 1* — so the first two scrolls return identical rows and the list appears to stall, with no error anywhere. `hasMore` is derived from `total` rather than "did we get a full page", which would promise one more page whenever the last page is exactly full. | Settled |
| D64 | 2026-08-18 | **BUG FIXED: 30 sitting deputies were unreachable** | `/deputados?situacao=ativo` returns 230 rows and `limit` caps at 200, so Browse Deputies could never show them all however large the page. Pagination fixes it; `PAGE_SIZE` also drops to 100 so the first screenful arrives sooner. | Settled |
| D65 | 2026-08-18 | **`__resetCaches()` moved into `test/setup.ts`** | Six commands now use `useCachedPromise`, whose module-level `Cache` outlives a test. Two tests were already passing on the *previous* test's data. Resetting in the shared setup means no test has to remember. | Settled |
| D66 | 2026-08-18 | **Today's Votes and Longest-Serving stay unpaginated** | Both are bounded by design: a single sitting day never approaches 200 votes, and the careers ranking is an explicit top-N. Pagination there would be machinery with nothing to page through. | Settled |
| D67 | 2026-08-19 | **Page size is a `pageSize` dropdown preference** (25 / 50 / 100 / 200), default 50 | Users differ on how much they want per request; 100 was our number, not theirs. Default matches openAR's own documented `limit`, so an unset preference behaves like the API's baseline rather than an invention of ours. Follows raycast-publico's `maxArticles` precedent. | Settled |
| D68 | 2026-08-19 | Use the **generated `Preferences` type**, never a hand-written copy | raycast-publico's own note: redeclaring it widens `"25" \| "50" \| "100" \| "200"` back to `string` and drifts silently when the manifest changes. | Settled |
| D69 | 2026-08-19 | `getPageSize()` **clamps through `clampLimit`** | Raycast stores preferences outside the extension, so a hand-edited file could otherwise push a value past the API's 1..200 range and turn every list into a 400. Parse failures fall back to the default rather than propagating `NaN` into a URL. | Settled |
| D70 | 2026-08-19 | **CI builds before it typechecks** | Verified empirically: only `ray build` generates `raycast-env.d.ts`, and `ray lint` does not. Since that file is gitignored and now holds the `Preferences` type, typechecking first would fail on a clean checkout. | Settled |
| D71 | 2026-08-19 | The preference is **read inside the component**, not at module load | A value captured at import time would need a restart to take effect. Read per render, a changed preference applies on the next launch. In `usePromise` it is passed as an argument rather than closed over, so the hook re-runs when it changes. | Settled |
| D72 | 2026-08-19 | **Retry lives in `RequestEmptyView`**, offered only on failures | One place covers seven lists and three detail views. Not offered when a request succeeded and found nothing: retrying would return the same nothing, so the action would be a lie. | Settled |
| D73 | 2026-08-19 | **`/legislaturas` implemented**; "current" resolved from `dataFim === null` | The endpoint was never built — only the nested `legislaturas` field existed. Resolving current from the data rather than hardcoding `XVII` cannot go stale at the next election, and a hardcoded id fails silently by showing a closed legislature as if it were live. | Settled |
| D74 | 2026-08-19 | **Legislature dropdown only where the accessory slot is free** | Raycast allows one `searchBarAccessory`. Search Initiatives, Search Petitions and Browse Committees get the dropdown; Browse Deputies and Browse Party Votes keep their party filter, which is more useful there, and take the legislature from the preference alone. | Settled |
| D75 | 2026-08-19 | **`defaultLegislature` preference stores a *scope*, not an id** | `"current"` / `"all"` rather than `"XVII"`. A stored id would pin to whichever legislature was current when the preference was set and quietly go stale; a scope re-resolves against live data every launch. | Settled |
| D76 | 2026-08-19 | `useLegislatures` is **unfiltered while loading and on failure** | Returning `""` is the honest answer — "we do not yet know which is current" — so the first request is unfiltered rather than filtered by a guess, and a `/legislaturas` outage degrades the filter instead of taking the whole list down. | Settled |
| D77 | 2026-08-19 | **Four AI tools**: today's votes, search initiatives, party votes, search deputies | Raycast's AI can call them directly, so "how did PS vote on the budget?" needs no command. Built after A2 so every tool can take a `legislature` argument — tools written before it would have needed rewriting. | Settled |
| D78 | 2026-08-19 | Tools return **structured data, not markdown** | Phrasing is the model's job; pre-formatting only constrains the answer. They also reuse the same `lib/` helpers the views do, so a tool and a command cannot disagree about what a vote means. | Settled |
| D79 | 2026-08-19 | Tools call the initiative field **`stage`**, never `result` or `approved` | Same trap as the UI (D46) with a worse failure mode: a model handed a field called `result` would report a bill as passed when `estado` merely records the phase of the last event. A test asserts those names are absent. | Settled |
| D80 | 2026-08-19 | Tool failures **propagate** rather than returning empty | A tool that swallows an error lets the model report "no votes today" when the truth is "we could not reach openAR" — a confident wrong answer about parliament, which is the worst outcome this extension can produce. | Settled |
| D81 | 2026-08-19 | **ETag revalidation is opt-in per call**, not automatic | Only `/iniciativas/{id}` and `/peticoes/{id}` send weak ETags. Sending `If-None-Match` elsewhere would cache a body the server never revalidates, so it could only ever be served stale. `request()` takes an explicit `revalidate` flag. | Settled |
| D82 | 2026-08-19 | The ETag store is **in-memory, not Raycast's `Cache`** | A command's process is short-lived, so this saves repeat fetches *within* a session — reopening the same initiative while navigating — which is the case that actually happens. Persisting it would need eviction and staleness rules to buy the rarer across-session case, against an API that changes daily. | Settled |
| D83 | 2026-08-19 | A response **without an `ETag` is not stored** | There would be nothing to send as `If-None-Match`, so the body could never be revalidated and would only ever be served stale. | Settled |
| D84 | 2026-08-19 | `304` is handled **before** the `!response.ok` check | A 304 has `ok === false` but is a success, and it carries no body — calling `response.json()` on it throws. Order is load-bearing. | Settled |
| D85 | 2026-08-19 | **Do not build on `@openar/mcp`** — it is a substitute for our AI tools, not an input to them | Inspected v0.1.2 from npm (openar.pt is egress-blocked, npm is not). It is a **stdio** MCP server launched as `npx -y @openar/mcp` by an MCP client — Claude Desktop, Claude Code, or Raycast's own MCP support. A Raycast extension cannot spawn and speak to it, and should not try. Anyone who wants those 12 tools can add it in one line **without this extension**. | Settled |
| D86 | 2026-08-19 | **Correction to D77's framing:** the AI tools are *not* the differentiator — the commands are | `@openar/mcp` already exposes 12 tools over the same API, so our 4 are not a moat. What MCP cannot give anyone is the browsable, keyboard-driven UI in the launcher: seven commands, detail views, party and legislature filters. Our tools still earn their place — zero setup for a Raycast user, and they share `lib/` with the views so a tool and a command cannot disagree — but they are a convenience, not the reason the extension exists. | Settled |
| D87 | 2026-08-19 | Their tool surface is a **useful cross-check** | They mirror endpoints 1:1 (`list_*` / `get_*`, 12 tools); ours are shaped around questions a person asks (4 tools). Ours also guard the `estado` trap (D79), which a 1:1 wrapper does not. Gap worth noting: we expose no petitions or committees tool, though we have commands for both. | Settled |
| D88 | 2026-08-19 | **Nine AI tools**, closing the gap against `@openar/mcp`'s twelve | Added petitions, committees, initiative detail, deputy detail and deputy activity. Ours stay question-shaped rather than a 1:1 endpoint mirror: `get-initiative` returns the per-stage *votes*, which is what "did it pass?" actually wants, instead of handing the model a raw `estado`. Deliberately not matched: `get_meta` and `get_votacao`, which answer nothing a person asks. | Settled |
| D89 | 2026-08-19 | **Deputy Activity built now — it was never blocked** | Correcting a decomposition failure: P10.1 was marked blocked because *one* facet of it was uncertain. `/deputados/{id}/atividade` returns 18 arrays; 17 are ordinary records — interventions, requerimentos, committee work, rapporteurships — with no dependency on the vote question at all. Only per-deputy *vote positions* were ever in doubt. | Settled |
| D90 | 2026-08-19 | Activity is summarised as **counts per category**, not lists | The spec declares every one of those arrays as `type: object` with no properties, so their element shapes are only knowable from live data. Counting is the one thing that can be done honestly without it — and "how much of each kind of work does this deputy do" is a better answer than a list of opaque records anyway. | Settled |
| D91 | 2026-08-19 | The absence of a voting record is **stated, not left as a gap** | Both the view and the tool say plainly that plenary votes are recorded per party rather than per deputy. Otherwise a reader — or a model — infers from an empty field that a deputy never votes, when the data simply is not published per person. | Settled |
| D92 | 2026-08-19 | **CI had never run once** — the workflow only triggered on `main` | Twenty-nine commits, all to a feature branch with no PR, against `push: branches: [main]`. GitHub reported zero registered workflows. Every claim that "CI is green" was unfounded. Triggers now cover any branch, plus `workflow_dispatch`. | Settled |
| D93 | 2026-08-19 | **`keywords` are capped at 12 per command** — four commands were over | `must NOT have more than 12 items`, a hard **error** from `ray lint`'s manifest schema. Only visible with network, since the schema is fetched from raycast.com — which is exactly the check the dev container cannot do. Trimmed to the Portuguese terms a speaker would type (accented and unaccented) plus the English ones the title does not already cover. | Settled |
| D94 | 2026-08-19 | **CI is green — for the first time verifiably** | Run #2 (`0de59c7`) passed `ray lint` → `ray build` → `typecheck` → `test:coverage` end to end on GitHub's runners: 462 tests, 100% coverage, and the manifest validated against the real remote schema. This is the first evidence in the project's history that the extension passes checks the dev container cannot perform. | Settled |
| D95 | 2026-08-19 | **The extension still ships Raycast's placeholder icon** — a store blocker nothing catches | `assets/extension-icon.png` is the generic red chip the scaffold generated, untouched since `f20313a`. It is a valid 512×512 PNG, so `ray lint`, `ray build` and CI all pass it without comment — the failure mode is purely a human one. Found by auditing what *submission* needs rather than what the code needs, which is a different question and had never been asked. Queued as `PLAN.md` A6; Pillow is available in this container, so it does not need the author. | **Closed by D96/D97** |
| D96 | 2026-08-19 | **The extension icon is the AR's own mark, supplied by the author** | Closes D95. Two prior positions were wrong and are corrected here. First, "an institutional mark is a liability" was too strong — `raycast-publico` ships *Público*'s own red serif P and passed store review, so a third party's brand mark is an accepted pattern. Second, the concern that the AR's avatar would be the Republic's coat of arms — state insignia, a different legal category — turned out not to apply: their mark is a stylised São Bento facade with an `AR` lockup, an institutional logo rather than the national arms. | Settled |
| D97 | 2026-08-19 | The 360×360 source is **upscaled to 512×512 with Lanczos**, not redrawn | The store wants 512. A 1.42× upscale on art that is already smooth-edged loses nothing visible, checked on a contact sheet at 512/128/64/32. Redrawing it would have risked drifting from a mark we do not own — a worse failure than slight softness. If a larger original ever surfaces, dropping it in is a one-file change. | Settled |
| D98 | 2026-08-19 | **Nothing in the toolchain can catch a placeholder icon** | `ray lint`, `ray build` and CI all passed the scaffold's generic chip for thirty commits, because it was a valid 512×512 PNG the whole time. The check that finds this class of defect is a person looking at the artefact — the same lesson as the 0-byte command file (§4), in a different costume. | Settled |
| D99 | 2026-08-19 | **The inventory of finished work moved from `PLAN.md` to here** | `PLAN.md` had grown a "What exists" section, which is exactly the drift `CLAUDE.md`'s three-document table exists to prevent: the plan is *what we do next*, and a list of what shipped is *what we know*. `PLAN.md` is now forward-only — an item is deleted the moment it lands, rather than being marked done and left in place. | Settled |
| D100 | 2026-08-20 | **Full-repo audit: every source and test file read, plus tooling** — ts-prune (dead exports), depcheck (dependencies), jscpd (duplication), and **Stryker mutation testing** over all of `src/` to answer "which tests never fail" with evidence rather than opinion | The user asked for a deep audit of dead code, duplication, weak tests and tech debt. Reading alone cannot find a test that passes when the code is broken; mutation testing can, and it also *found nothing where the suite is strong*, which is itself a result. Findings in §6; the prioritised work items are `PLAN.md` Track C. Stryker was installed only for the audit and reverted — adopting it permanently is a decision left open (Track C). | Settled |
| D101 | 2026-08-20 | **BUG FOUND (P0): Browse Party Votes' "Voted in favour" filter never reaches the API** | `browse-party-votes.tsx` builds `listVotacoes({[how]: sigla})` where `how` is the dropdown id `"a_favor"` — but the client's parameter is camelCase `aFavor`, so the computed key silently misses and the request goes out **unfiltered**. "In favour" is the *default* position, so the command's default state shows the whole vote archive labelled as the party's in-favour votes — the confident-wrong-answer failure D80 exists to prevent. Verified empirically against the real client with a stubbed fetch. The `get-party-votes` **tool** uses `"aFavor"` and is correct, so tool and command disagree — the exact divergence the shared-`lib/` rule was meant to make impossible. Root cause: a computed object key bypasses TypeScript's excess-property checking, and the command tests assert only the `contra` and `abstencao` positions. | **Fixed (D103)** |
| D102 | 2026-08-20 | Audit findings recorded here (§6); remediation queued as **`PLAN.md` Track C**, ordered C1 (the bug) → tests → duplication → hygiene | Keeps the lanes: what we *know* lands in this file, what we *do next* in the plan. Track C is deliberately numbered fresh rather than reusing the retired A-numbers, which older decisions (e.g. D95) still cite. | Settled |
| D103 | 2026-08-20 | **D101 fixed via a shared `positionFilter()` in `lib/votes.ts`** — an explicit branch-by-branch mapping from the question vocabulary (`for` / `against` / `abstained`) to the client's parameters, consumed by *both* the command and the `get-party-votes` tool | Considered renaming the client params to the wire names instead (no translation to get wrong), but that breaks the client's camelCase convention (`dataInicio`, `aFavor`) for every caller to fix one site. A single tested mapping both consumers share is smaller and makes the tool/command divergence structurally impossible, which is what D77/D78 promised all along. The dropdown ids switched from wire names to the question vocabulary so no id can be mistaken for a parameter again. Regression tests pin the exact parameter for **all three** positions — with `toEqual`, since the failing shape was an *extra ignored key* that a subset match would pass. | Settled |
| D104 | 2026-08-20 | **The stub's keep-list is "whatever our code *or @raycast/utils* executes", not "whatever our tests mention"** | The C7 trim removed `showToast`, `Toast` and `LaunchType` because no command uses them — and 19 failure-state tests broke at once: `usePromise`'s own error path calls them. The stub serves two clients, and the second one's imports are invisible to a grep over our sources. They are restored with a comment saying whose dependencies they are. The rest of the buzz inheritance (Form layer, LocalStorage, Keyboard, `useNavigation`, `Action.SubmitForm`, `Action.Open`, list sections — ~300 lines) is gone, and `environment.extensionName` no longer claims to be "buzz". | Settled |
| D105 | 2026-08-20 | **Mutation testing adopted as an opt-in check**: `npm run test:mutation` + a manual `workflow_dispatch` job, with Stryker installed on demand (pinned major) rather than added to devDependencies | It earned its place by finding the one defect class the coverage ratchet cannot see (D101), and by grading the C2 hardening (81.2% → 88.0%, §6.2). Not per-push: a full run costs ~10 minutes against a 12-second suite. Not in devDependencies: ~175 packages would slow every push's `npm ci` for a tool that runs occasionally — the on-demand install keeps the lockfile and the fast path untouched, at the accepted cost of resolving versions at run time. | Settled |
| D106 | 2026-08-20 | **Track C closed.** C11's nits resolved by decision rather than change: `@types/node` stays at 22 — it matches `@raycast/api`'s own engine floor (`>=22.22.2`), and typing against a newer Node than the runtime guarantees invites using APIs the extension host may not have. `depcheck`'s flag on `@vitest/coverage-v8` is a false positive (loaded by `vitest --coverage`), recorded in §6.5 for the next dependency sweep. | Settled |
| D107 | 2026-08-21 | **Docs audit and rework** — `CLAUDE.md` and this file brought back in line with the tree. `CLAUDE.md`: the five-file table was captioned "four documents"; the layout tree predated `loadListPage` / `detailStateMarkdown`; the errors rule still read "in buzz"; the D104 stub keep-list lesson was missing from §3. Here: §3's blocker ids collided with `PLAN.md`'s Track B ids while meaning different things (context B2 was screenshots, plan B2 the `actp` question), so blockers are now **K-numbered** — B1→K1, B2→K2, B4→K3, the resolved title row retired to a footnote; O7's dangling "§3.1" pointer fixed; §6 marked resolved with per-subsection outcomes; D100–D106 put in numeric order (content untouched — reordering is not rewriting). | Two docs sharing an id namespace with different meanings, and a working agreement that miscounts its own documents, are exactly the drift that misleads a fresh session. The decision log itself stays append-only. | Settled |

### Open questions

| # | Question | Why it matters | Blocks |
|---|---|---|---|
| ~~O2~~ | ~~`no-view` or `view`?~~ | **Closed (D21).** `view`. | — |
| ~~O3~~ | ~~Store or private use?~~ | **Closed (D22).** Raycast Store, so the manifest, README and screenshot rules are binding. | — |
| ~~O4~~ | ~~Scope of "today"; non-sitting days~~ | **Closed 2026-08-18 (D38, D39, D41).** Plenary only, per the endpoint's own definition; "today" is Lisbon's date; a non-sitting day gets its own empty state, distinct from an error. | — |
| ~~O5~~ | ~~Windows too, or macOS only?~~ | **Closed (D23).** Both. No macOS-only APIs anywhere. | — |
| ~~O9~~ | ~~Does store review accept `Assembleia da República` as the title?~~ | **Closed 2026-08-19.** The first real CI run settled it: the Title-Case complaint is a **`warning`**, not an error, and did not fail the build — the failure was the unrelated keyword cap (D93). `ray lint`'s author validation also passed, confirming that failure was purely the dev container's egress block. The title stays. | — |
| ~~O6~~ | ~~Portuguese or English UI copy?~~ | **Closed 2026-08-18 (D28).** English copy, Portuguese keywords — the pattern raycast-publico already uses. | — |
| ~~O8~~ | ~~`/votacoes`, `/peticoes`, `/comissoes` contracts~~ | **Closed 2026-08-18 (D18).** The full OpenAPI spec was supplied and vendored; all 16 endpoints are documented. | — |
| O10 | Do per-deputy **vote positions** exist in `actp`, or only in `detalhe`'s raw HTML? | Narrowed by D89: everything *else* in the activity endpoint is now built. `actp` ("outras actividades em plenário (votos, etc.)") is the only candidate, and its element shape is undeclared. This is now a small question about one array rather than a blocker on a whole command. | one array |
| O7 | What do the pre-existing iCloud `CLAUDE.md` / `context.md` contain? | They may hold decisions from local sessions that this log has never seen. The 2026-08-18 upload delivered macOS bookmark alias stubs (2.5 KB Apple binary plists), not file contents — see §3 K3. Until recovered, this log may be missing history. | — |

---

## 3. What is blocked

Everything below needs something this environment cannot provide. **Two live
blockers remain** (K1, K2), and both dissolve on the same networked machine —
one session's work. K3 is inert — a nice-to-have that gates nothing.

Blockers are **K-numbered** since D107: they used to share `B` ids with
`PLAN.md`'s Track B while meaning different things, which was a trap. This
table holds the *reasons*; the plan holds the *work*.

| # | Blocker | Why it matters | Unblocks |
|---|---|---|---|
| K1 | **Nothing has ever run against the live API.** `api.openar.pt` is denied by the dev container's egress proxy (403 on CONNECT, re-tested three times). All 525 tests run against a stubbed `fetch`, so URL shape, envelope handling, pagination and the 429 path are verified against *our reading of the vendored spec* — not against openAR. | The single largest outstanding risk in the project. | `npm run smoke` on any networked machine (`PLAN.md` B1), or allowlisting `openar.pt` + `api.openar.pt` in the [environment settings](https://code.claude.com/docs/en/claude-code-on-the-web). |
| K2 | **No screenshots.** `metadata/` needs images from a working local install, and the directory does not exist. | Raycast Store review requires them, so this gates submission outright — it is the last hard gate. | A machine that can run `npm run dev` (`PLAN.md` B3). |
| K3 | **O7 unrecovered** — the original iCloud `CLAUDE.md` / `context.md`. The 2026-08-18 upload delivered macOS bookmark alias stubs (2.5 KB Apple binary plists), not the files. | They may hold decisions from local sessions this log never saw. | Open each file in the Files app so it downloads fully, *then* share it — or paste the contents. |

One former blocker is resolved and retired from the table: the extension-title
question (O9) closed when the first real CI run showed the Title-Case
complaint is a `warning`, not an error (D94).

**The API contract itself is no longer blocked.** The full OpenAPI 3.1 spec is
vendored at `docs/openar-openapi.json` with `OPENAR-API.md` written from it
(D18), so no session needs network access to know the contract.

---

## 4. The opening audit — resolved

The 2026-08-18 audit of commit `eef5791` found a scaffold that did nothing: a
**0-byte command file** that `ray build` compiled and reported success on, a
misspelled permanent store slug, placeholder copy throughout, no lockfile, no
tests, no CI. All of it is fixed — see D21–D31 and the P0 commit.

Two findings were **not** defects and remain true today: `ray lint` reports
`Invalid author "caasols"` and a JSON-schema compile failure *locally only*,
because both are raycast.com calls the egress proxy blocks. They pass in CI —
**now verified rather than assumed** (D92, D94). The same blindness hid a real
error for twenty-nine commits: the 12-item `keywords` cap (D93).

The audit's lasting lesson is R6 in `CLAUDE.md`: **a green build proves almost
nothing.** `ray build` compiling an empty file is why every command has a test
that renders its real default export.

---

## 5. What the reference repos taught us

| Repo | What we took |
|---|---|
| [`caasols/raycast-buzz`](https://github.com/caasols/raycast-buzz) | Layout (`lib`/`components`/commands), colocated tests, the `@raycast/api` vitest stub, split tsconfigs, 100% coverage thresholds. The stub is the single biggest time-saver in the project: `@raycast/api` has no resolvable Node entry point, so vitest cannot import *or mock* it. |
| [`caasols/raycast-publico`](https://github.com/caasols/raycast-publico) | Everything store-facing: English `Browse X` titles with Portuguese keywords (D28), brand as `subtitle`, the README shape, `ray lint` in CI on Node 24, and the `maxArticles` preference pattern this project's `pageSize` follows. |
| [`block/buzz`](https://github.com/block/buzz) | Contributor-guide conventions only — it is the Buzz *product*, a Rust workspace, with no Raycast code. Its line "green CI and runtime evidence answer different questions" became R6. |

Where the two Raycast repos disagree — buzz colocates tests, publico uses
`src/__tests__/` — buzz wins (D32).

---

## 6. The 2026-08-20 deep audit — resolved

Method (D100): every file in `src/` and `test/` read end to end; `ts-prune` for
dead exports; `depcheck` for dependencies; `jscpd` for duplication; **Stryker
mutation testing** across all of `src/` to find assertions that cannot fail.

**Every finding below is remediated** — Track C landed the same day
(D103–D106) and was deleted from the plan per the forward-only rule. The
section stays as evidence, and because §6.2's survivor bins are the reference
future mutation runs are read against.

### 6.1 The defect (P0) — since fixed (D103)

**The "Voted in favour" filter in Browse Party Votes was silently dropped**
(D101). `{[how]: sigla}` with `how = "a_favor"` misses `ListVotacoesParams`'
camelCase `aFavor`, TypeScript's excess-property check does not fire on
computed keys, and the tests only ever assert the other two positions. The
default state of the command shows unfiltered votes labelled as the party's
in-favour votes. Reproduced against the real client:

```
a_favor position → /v1/votacoes?sort=desc&page=1&limit=50        ← no filter!
contra  position → /v1/votacoes?contra=PS&sort=desc&page=1&limit=50
```

The `get-party-votes` tool mapped positions correctly, so the tool and the
command gave different answers to the same question until D103 made them share
one tested `positionFilter()`.

### 6.2 Which tests never fail (mutation results)

Stryker ran **1 377 mutants** against the full suite: **1 118 killed, 258
survived, 1 uncovered — an 81.2% mutation score** in 9½ minutes. The shape
matters more than the number: `lib/` infrastructure is near-bulletproof
(`etag-cache`, `pagination`, `preferences` at 100%; `errors` 96%; `query` 95%;
the client 85%), while the **command files are the weak layer** —
`browse-committees.tsx` 57%, `search-petitions.tsx` 60%, `longest-serving`
69%, `browse-party-votes.tsx` 74%. The survivors sort into four bins:

**Real, assertable gaps** (the C2 work):

- **No tool test pins `sort`** — mutating `sort: "desc"`/`"asc"` to `""`
  survives in five of nine tools. `objectContaining` checks the filters and
  ignores the ordering, so a tool could silently return oldest-first.
- **`isShowingDetail={rows.length > 0}` is asserted only in Today's Votes** —
  the other five list commands' mutants (`>= 0`, `true`, `false`) all survive,
  though the stub exposes `data-showing-detail` precisely for this.
- **The whitespace-only search rule (D47) is untested in most commands** —
  mutants that delete `.trim()` or hardcode the `=== ""` branch survive in
  Browse Committees, Browse Deputies and Search Petitions. Only the
  happy-path trim ("` tua `" → `tua`) is pinned.
- **Client tests assert `searchParams`, rarely the pathname** — mutating the
  path literal (`"/peticoes"` → `""`) survives for `listPeticoes`,
  `listDeputados`, `listComissoes`, `listCarreiras`. One `toBe(BASE_URL+path)`
  per function closes this.
- **`parseRetryAfterSeconds` loses `.trim()` unnoticed** — `Number("  30 ")`
  parses anyway, but a *whitespace-only* header would then return `0` ("retry
  now") instead of `undefined`; no test covers that input.
- **Commands hardcode `""` instead of importing `ALL_LEGISLATURES`** — the
  constant can be mutated freely because the hook's tests compare it to
  itself and the commands never reference it. Either import it at the call
  sites or pin its value.
- **Detail views never assert Retry is *absent* on success** — `{error && …}`
  mutated to `true` survives in `deputy-detail.tsx` and
  `committee-detail.tsx`; `RequestEmptyView` has exactly this test, the
  detail views don't.
- **`get-deputy`'s `recentInitiatives` mapping has literally no coverage** —
  the fixture's `iniciativas` is `[]`, so the map callback never runs (the
  suite's only uncovered mutant).
- The `asPaginated` fallbacks are tested with fixtures where fallback and
  real value coincide (`page: 1` falling back to `1`) — indistinguishable by
  construction; fixtures with `page: 7` would actually pin them.

**Stub-masked** (fix the stub, not the assertion — CLAUDE.md §3's rule):

- Every command's `keywords={…}` can be emptied — ~15 survivors — because the
  stub accepts `keywords` and **renders nothing**. Serialise `data-keywords`
  the way `fallback` was added (D57), then assert it.
- `{rows.length === 0 && <RequestEmptyView/>}` mutated to `true` survives
  everywhere because the stub's `List` hides empty views whenever items
  exist — faithful to Raycast, so these are equivalent *under the stub* and
  cost nothing.

**Equivalent mutants** (explain, don't chase): `truncateQ`'s `>` → `>=` (at
exactly 100 chars, `slice` is identity); `formatVoteDate`'s `!isoDate` guard
(an empty string parses to `NaN` and returns `null` through the second exit
anyway); `request`'s `revalidate` default flipped to `true` (harmless while
list responses carry no `ETag` — worth one pinning test, since a server that
started sending ETags would silently begin caching).

**Cosmetic string survivors** (~90, accept): bold markers, `·` separators and
label fragments inside markdown builders where the tests already assert the
semantically load-bearing substrings. Chasing these buys assertion-brittleness,
not safety.

**Verification (same day, after PLAN C1/C2/C4 landed):** a second full run
scored **88.0%** — 1 218 of 1 384 killed, survivors down from 258 to 166,
*zero* uncovered. Tools 97.0%, components 97.6%, the client 94.2%; `errors`,
`pagination`, `preferences`, `etag-cache`, `request-empty-view` and five of
nine tools at 100%. Every remaining survivor sits in the explained bins above
— cosmetic markdown fragments in the presentation helpers, the stub-masked
empty-view guards, and the four documented equivalents — so C2's done
condition ("100% explained, not 100% score") is met.

### 6.3 Dead code

- **`VotacaoKey`** (`types.ts`) — exported, zero importers. The "compound key"
  lesson it encodes lives on in comments and the `${iniciativaId}:${id}` row
  keys; the interface itself is dead.
- **The test stub carries ~250 lines of buzz-inherited surface nothing here
  uses**: the whole `Form` layer with its context plumbing, `Action.SubmitForm`,
  `Action.Open`, `LocalStorage` + `__resetLocalStorage`, `Keyboard` +
  `shortcutAttr`, `confirmAlert`/`Alert`/`Toast`/`showToast`/`popToRoot`/
  `showHUD`, `useNavigation`/`push`/`pop`, `LaunchType`, `List.Section` and
  `ActionPanel.Section`. Coverage cannot see any of it — `test/` is outside the
  coverage include. Two stale buzz artefacts survive verbatim:
  `environment.extensionName === "buzz"`, and the `Keyboard` comment citing
  `src/set-status.test.tsx`, a buzz file that has never existed here.
- **`ACTIVITY_CATEGORIES` covers 16 of the endpoint's 17 activity arrays** —
  `dadosLegis` is absent with no comment saying whether that is a choice, and
  the test's own comment ("18 keys come back; `deputado` is the subject") does
  not arithmetic its way to the 16 it asserts.

**Resolved:** `VotacaoKey` deleted; the stub trimmed by ~300 lines (with the
`showToast` lesson that trim taught recorded as D104, and the keep-list rule
now in `CLAUDE.md` §3); `dadosLegis`'s exclusion is a documented choice in
`activity.ts`, and the test's arithmetic comment now adds up.

### 6.4 Duplication (jscpd: 85 clones, 9.0% of lines)

Ranked by how much a single extraction removes:

1. **The paginated-fetch closure, six times** (five commands +
   `CommitteeDetail`): `toApiPage` → `list*({legislatura: ""→undefined, q:
   trim→undefined, sort, page, limit})` → `{data, hasMore: hasMorePages(…)}`.
   This is mechanical plumbing, not look-alike UI — the D54 caution does not
   apply.
2. **Test fixtures**: the full `VotacaoListItem` literal appears in ≥4 files,
   the `Iniciativa` literal in ≥3, a local `page()` helper in ~5. Most of
   jscpd's 85 clones are these.
3. **The detail-view scaffold, four times** (initiative / deputy / petition /
   activity): `error ? "# title\n\n**Could not load…**" : data ? render :
   "Loading…"` plus the conditional Retry action.
4. **The legislature-selection dance, three times** (Search Initiatives,
   Search Petitions, Browse Committees): `useState<string | undefined>` +
   `?? initialId` + the same three-line comment.
5. Client micro-repeats: `new OpenArError("openAR returned an unexpected
   response shape", 500)` nine times; `x === undefined ? undefined :
   clamp/truncate` in every list function.

**Resolved:** items 1–4 became `lib/pagination.ts`' `loadListPage`,
`test/fixtures.ts`, `lib/detail-markdown.ts`' `detailStateMarkdown`, and the
selection fold into `useLegislatures`; item 5's error literal became the
`unexpectedShape()` factory. A 2026-08-21 re-run reports 86 clones / 7.97% —
but the composition changed: 67 of 86 are test-to-test, the per-command
`vi.mock` preamble that vitest hoists per file (sharing it would couple
tests for little gain), and most of the rest is the client's deliberately
parallel param objects. The *drifting-copy* duplication the ranking targeted
is gone; what remains is structural parallelism, accepted.

### 6.5 Drift and hygiene

- **README's AI-tools table lists 4 of the 9 tools** — stale since D88 added
  five.
- `petitions.ts` builds `"8,421 signatures"` then `petitionDetailMarkdown`
  strips `" signatures"` back off — a formatter split the wrong way.
- `pageSize` is closed over (not a dependency) in six `useCachedPromise`
  closures, while `longest-serving-deputies.tsx` deliberately passes it as an
  argument *with a comment explaining why*. One of the two patterns is wrong;
  mid-session preference changes only affect the closed-over six.
- Only `get-todays-votes` pins D80 (failures propagate) with a test; the other
  eight tools rely on it implicitly.
- `depcheck` flags `@vitest/coverage-v8` — false positive, it is loaded by
  `vitest --coverage`. `@types/node` is 22.x while CI runs Node 24.

**Resolved:** the README lists all nine tools; the signature formatter is
split as count + label; `pageSize` is a hook argument with a dependency entry
everywhere; all nine tools pin D80 with a rejection test; the `@types/node`
question closed by decision, not change (D106 — 22.x matches `@raycast/api`'s
own engine floor).

### 6.6 What is *not* wrong (looked for, absent)

- No dead exports beyond `VotacaoKey`; no unused dependencies.
- The `lib/` test suites (client, query, errors, dates, etag, pagination,
  preferences) are exemplary — edge cases chosen for documented API traps, not
  coverage padding. The client suite alone pins URL shape, clamping, ETag/304
  ordering and the error taxonomy in 94 cases.
- The empty/failed/rate-limited trichotomy (D41) is enforced in every list.
- No `fetch` outside the client, no `Preferences` redeclaration, `include`
  always explicit, no `detalhe` rendering — the standing rules held.
