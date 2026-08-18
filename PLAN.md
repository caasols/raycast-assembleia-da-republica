# PLAN — what we build next

The forward plan. Project state, decisions and audit findings live in
**`context.md`**; the working rules live in **`CLAUDE.md`**. Read both before
starting a phase.

- **Status:** P0, P1, P2, P3 complete — one command working end to end against a stubbed API
- **Ready now:** P4 (second command) or P5 (publishing prep)
- **Blocked:** nothing on the critical path — P1 is complete
- **API contract:** `docs/openar-openapi.json` + `OPENAR-API.md` (complete)
- **Last updated:** 2026-08-18

---

## 1. Candidate commands

Derived from openAR's dataset list. **Speculative** — must be re-derived from
the real spec (P1.4). Listed to shape the roadmap, not committed.

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

### P0 — Foundations ✅ *complete (2026-08-18)*

- **P0.1** ✅ O2 → `view`, O3 → Store, O5 → Windows + macOS, O6 → English copy with Portuguese keywords (D21–D23, D28). Only O9 (extension title) remains.
- **P0.2** ✅ Slug fixed to `assembleia-da-republica` (D24), command Title-Cased, real description and subtitle, `mode: view`.
- **P0.3** ✅ Harness ported verbatim. `tsconfig.json` also gained buzz's test `exclude` and explicit `types` — without them `tsc --noEmit` checks the tests without the DOM lib and the jest-dom matchers fail.
- **P0.4** ✅ Committed.
- **P0.5** ✅ `.github/workflows/ci.yml` — `ray lint`, typecheck, coverage (100% ratchet), build, on Node 24 (D29, D31).
- **P0.6** ✅ Python/graphify/framework entries pruned; LICENSE holder is now `Carlos Sol`.

**Verified:** `typecheck`, `test:coverage` (100/100/100/100), `build`, `eslint src` and `prettier --check` all pass locally. `scripts/smoke.ts` is written but **cannot run here** — api.openar.pt is egress-blocked.

### P1 — Understand the API ✅ *complete*
- **P1.1** ✅ Full OpenAPI 3.1 spec vendored at `docs/openar-openapi.json` (D18).
- **P1.2** ✅ All 16 endpoints, schemas, limits, caching and licensing documented
  in `OPENAR-API.md`. Licence is **MIT** (D20) — P5's licensing blocker is gone.
- **P1.3** Settle O4 against what the data actually supports.
- **P1.4** Re-derive §1 from the real spec; kill the speculative entries.

**Done when:** every §1 command is backed by a named endpoint, or dropped.

### P2 — Design the client ✅ *complete (2026-08-18)*
- **P2.1** ✅ Hand-written over generated (D33); module functions over a class (D34); `usePromise` over `useFetch` (D35).
- **P2.2** ✅ `src/lib/types.ts` models only what is consumed, including the compound `VotacaoKey`. `OpenArError` carries status and `Retry-After` (D36, D37).
- **P2.3** ✅ `openar-client.ts`, `query.ts`, `errors.ts`, `types.ts` — 100% covered, 56 tests.
- **P2.4** ⚠️ Written and driving the real client, but **cannot run here** — api.openar.pt is egress-blocked. Must be run locally before P3 is trusted.

**Verified:** all gates green; 100/100/100/100 across `openar-client.ts`, `query.ts`, `errors.ts`. Two implementation bugs were caught by the tests — see `context.md`. **Not** smoke-tested against the live API (P2.4).

### P3 — First command, end to end ✅ *complete (2026-08-18)*
`Browse Today's Votes` renders `/votacoes` for the current Lisbon date in a
single request, with the party breakdown in the detail pane, result-tinted
icons, and three distinct empty states (quiet day / failure / rate limited).

- `src/lib/dates.ts` — Lisbon-anchored "today" and display formatting (D39)
- `src/lib/votes.ts` — reference, summary, result label, detail markdown (D40)
- `src/what-was-the-vote-today.tsx` — the view, keyed by `(iniciativaId, id)`
- `test/raycast-api-stub.tsx` — gained `List.Item.Detail` and icon-object
  serialisation (D42)

**Verified:** 99 tests, 100/100/100/100, all gates green. **Still never run
against the live API** — P2.4 remains outstanding.

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
