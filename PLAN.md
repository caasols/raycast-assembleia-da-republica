# PLAN — what we build next

The forward plan. Project state, decisions and audit findings live in
**`context.md`**; the working rules live in **`CLAUDE.md`**. Read both before
starting a phase.

- **Status:** scaffold only — no implementation yet
- **Ready now:** P0 (no API access required)
- **Blocked:** P3 onward — `/votacoes` is not yet documented (O8)
- **API contract:** `OPENAR-API.md` (partial capture)
- **Last updated:** 2026-08-18

---

## 1. Candidate commands

Derived from openAR's dataset list. **Speculative** — must be re-derived from
the real spec once `context.md` §3 is unblocked. Listed to shape the roadmap, not committed.

| Command | Shape | Notes |
|---|---|---|
| `what-was-the-vote-today` | view, list | Already declared. Needs the non-sitting-day empty state (O4) |
| `search-initiatives` | view, list + search | Probably the highest-value command; largest dataset |
| `search-deputies` | view, grid or list | Photo grid may suit; depends on whether openAR serves images |
| `deputy-voting-record` | view, detail | Depends on votes being joinable to deputies — **verify** |
| `browse-committees` | view, list | Lowest value; likely defer |
| `search-petitions` | view, list | Public interest, unclear demand |

Sequencing instinct: **one command, end to end, with its full test suite, before
a second is started.** Two half-built commands teach us less than one finished
one, and the first one is where the client, error handling and test harness get
designed.

---

## 2. Roadmap

Ordered by dependency. Phases are deliberately small per `CLAUDE.md` R2. Nothing
past P1 should start until the API is actually understood.

### P0 — Foundations *(ready now, unblocked)*
Independent of the API, so it can proceed while `context.md` §3 is resolved.

- **P0.1** Resolve O2, O3, O5, O6 (see recommendations above).
- **P0.2** Fix `package.json`: the `name` slug **first** (it's permanent), then
  Title Case, real `description`, real `subtitle`, `mode` per O2.
- **P0.3** Port the test harness from raycast-buzz: `vitest`,
  `@vitest/coverage-v8`, `test/raycast-api-stub.tsx`, `test/setup.ts`,
  `vitest.config.ts`, `tsconfig.test.json`, and the `test`/`typecheck` scripts.
- **P0.4** Commit `package-lock.json`.
- **P0.5** CI: GitHub Actions running `lint` + `typecheck` + `test:coverage` +
  `build` on PRs. Do this *before* real code, so the ratchet exists from commit one.
- **P0.6** Prune the dead `.gitignore` entries; fix the `LICENSE` holder name.

**Done when:** an empty-but-real extension builds, lints, typechecks, and passes
a green test suite in CI.

### P1 — Understand the API *(blocked — see `context.md` §3)*
- **P1.1** ✅ *Done* — API reference vendored as `OPENAR-API.md` (D17).
- **P1.2** ⚠️ *Partial* — base URL, auth, rate limits, caching, pagination and 9
  endpoints documented. **Still missing `/votacoes`, `/peticoes`, `/comissoes`
  (O8)** and every response body beyond the envelope. Licensing/attribution
  terms are still undocumented and still need checking before publish.
- **P1.3** Settle O4 against what the data actually supports.
- **P1.4** Re-derive §1 from the real spec; kill the speculative entries.

**Done when:** every §1 command is backed by a named endpoint, or dropped.

### P2 — Design the client
- **P2.1** Brainstorm + pros/cons: hand-written client vs generated from
  OpenAPI; `@raycast/utils` `useFetch` vs a bare typed wrapper.
- **P2.2** Design the types, error model and caching strategy. Self-audit and
  recommend before writing it (R4).
- **P2.3** Build `src/lib/openar-client.ts` + `src/lib/errors.ts`, fully unit
  tested against fixtures.
- **P2.4** `scripts/smoke.ts` against the live API.

**Done when:** the client is 100%-covered and smoke-tested, with zero UI written.

### P3 — First command, end to end
Implement `what-was-the-vote-today` (or whichever P1.4 says is highest-value)
with its full test suite, real empty and error states, and the Portuguese
date/name formatting the data needs. **One command only.**

### P4 — Second command onwards
Repeat P3 per command, extracting shared UI into `src/components/` only on the
second use — not in anticipation.

### P5 — Publishing *(only if O3 says Store)*
Real README, `metadata/` screenshots, `CHANGELOG.md`, re-verify the two blocked
lint errors on a networked machine, then `npm run publish`.

### Parked — not committed
Notifications for new votes, menu-bar command for live sessions, preferences
(default party, language), caching/offline, AI-extension `tools` using openAR's
MCP server. Recorded so they aren't re-litigated as new ideas.
