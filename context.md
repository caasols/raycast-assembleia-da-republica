# context.md — project state and knowledge

What we know: what we're building, every decision taken, what's blocked, and
what the audit found. This is the **living record** — append to it as we go.

Companion documents:

| File | Holds | Read it when |
|---|---|---|
| **`CLAUDE.md`** | *How we work* — the standing rules (R1–R6), architecture conventions, test mechanics | Start of every session |
| **`context.md`** (this file) | *What we know* — project context, decision log, open questions, blockers, audit findings | Before proposing anything |
| **`PLAN.md`** | *What we do next* — candidate commands and the phased roadmap | When picking up work |
| **`OPENAR-API.md`** | *What the API does* — the openAR contract and its traps | Before writing any client code |
| **`docs/openar-openapi.json`** | The full OpenAPI 3.1 spec — source of truth | When the prose is ambiguous |

Decisions are append-only: add, don't rewrite. All of these are tracked in
git (D14/D18) — the repo is **private**, so internal working notes are fine here.
Keep credentials out regardless.

- **Repo:** `caasols/raycast-assembleia-da-republica` (private)
- **Reference implementation:** [`caasols/raycast-buzz`](https://github.com/caasols/raycast-buzz)
- **Last updated:** 2026-08-19

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
| D95 | 2026-08-19 | **The extension still ships Raycast's placeholder icon** — a store blocker nothing catches | `assets/extension-icon.png` is the generic red chip the scaffold generated, untouched since `f20313a`. It is a valid 512×512 PNG, so `ray lint`, `ray build` and CI all pass it without comment — the failure mode is purely a human one. Found by auditing what *submission* needs rather than what the code needs, which is a different question and had never been asked. Queued as `PLAN.md` A6; Pillow is available in this container, so it does not need the author. | Open |

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
| O7 | What do the pre-existing iCloud `CLAUDE.md` / `context.md` contain? | They may hold decisions from local sessions that this log has never seen. The 2026-08-18 upload delivered macOS bookmark alias stubs (2.5 KB Apple binary plists), not file contents — see §3.1. Until recovered, this log may be missing history. | — |

---

## 3. What is blocked

Everything below needs something this environment cannot provide. Nothing else
on the roadmap is blocked — and the list is shorter than it looks: B3 is closed
(D94), and B1 and B2 both dissolve on the same networked machine.

| # | Blocker | Why it matters | Unblocks |
|---|---|---|---|
| B1 | **Nothing has ever run against the live API.** `api.openar.pt` is denied by the dev container's egress proxy (403 on CONNECT, re-tested three times). All 462 tests run against a stubbed `fetch`, so URL shape, envelope handling, pagination and the 429 path are verified against *our reading of the vendored spec* — not against openAR. | The single largest outstanding risk in the project. | `npm run smoke` on any networked machine (`PLAN.md` B1), or allowlisting `openar.pt` + `api.openar.pt` in the [environment settings](https://code.claude.com/docs/en/claude-code-on-the-web). |
| B2 | **No screenshots.** `metadata/` needs images from a working local install. | Raycast Store review requires them, so this gates submission outright. | A machine that can run `npm run dev` (`PLAN.md` B3). |
| ~~B3~~ | ~~**O9 unanswered** — the extension title~~ | **Resolved 2026-08-19 (D94).** The first real CI run showed the Title-Case complaint is a `warning`, not an error. The title stays. | — |
| B4 | **O7 unrecovered** — the original iCloud `CLAUDE.md` / `context.md`. The 2026-08-18 upload delivered macOS bookmark alias stubs (2.5 KB Apple binary plists), not the files. | They may hold decisions from local sessions this log never saw. | Open each file in the Files app so it downloads fully, *then* share it — or paste the contents. |

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
