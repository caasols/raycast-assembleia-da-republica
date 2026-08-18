# PLAN — Raycast extension for openAR

What we're building, what's been decided, what's been found, and what's next.
Working rules live in **`CLAUDE.md`**; this file is *what we're doing*.

- **Repo:** `caasols/raycast-assembleia-da-republica`
- **Reference implementation:** [`caasols/raycast-buzz`](https://github.com/caasols/raycast-buzz)
- **Last updated:** 2026-08-18
- **Status:** scaffold only — no implementation yet

Decisions are append-only. Add, don't rewrite.

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
| D9 | 2026-08-18 | Project tracking moves to **`PLAN.md`**, which **is** committed; `context.md` is retired | A decision log that dies with the dev container isn't a log. `PLAN.md` is not in `.gitignore`, so it versions and diffs like code. Content folded in from `context.md`. | Settled |
| D10 | 2026-08-18 | Data source is **openAR** (`api.openar.pt`), not the raw parlamento.pt dumps | openAR normalises the official bulk XML/JSON into a queryable API and needs no auth. Consuming raw dumps would mean shipping a parser and a sync story inside a launcher extension. | Settled |
| D11 | 2026-08-18 | **Mirror raycast-buzz's structure and test strategy wholesale** | It already solves the hard parts: stubbing `@raycast/api` under vitest, split tsconfigs, 100% coverage thresholds, `lib`/`components`/command split. Divergence costs more than it buys. | Settled |
| D12 | 2026-08-18 | Working rules captured in `CLAUDE.md` | Per user request; see `CLAUDE.md` R1–R6 | Settled |

### Open questions

| # | Question | Why it matters | Blocks |
|---|---|---|---|
| O2 | `no-view` or `view` for the vote command? | Determines `.ts` vs `.tsx` and the whole command shape. `no-view` can only fire a HUD/toast — too thin for a list of votes. **Recommendation: `view`.** | P2 |
| O3 | Raycast Store, or private use? | Store review enforces naming, description, README and screenshot rules. If private, most manifest findings drop to cosmetic and P5 disappears. | P5 |
| O4 | Scope of "today" — plenary only, or committees too? Behaviour on a non-sitting day? | Shapes queries and the empty state | P1, P3 |
| O5 | Windows **and** macOS, or macOS only? | D2 claims both; raycast-buzz ships macOS-only. Cross-platform means no macOS-only APIs and doubles manual test surface. | P2, P5 |
| O6 | Portuguese or English UI copy? Both? | Data arrives in Portuguese. Mixed-language UI reads badly; an English UI over Portuguese content is a real trade-off. Store listings skew English. | P3 |

---

## 3. ⚠️ Current blocker — openAR docs unreachable

**Step 2 of the plan (read the openAR documentation) cannot be completed from
this environment.** The egress proxy blocks the hosts we need:

| Host | Status |
|---|---|
| `api.openar.pt` | ❌ blocked (403 CONNECT) |
| `openar.pt` | ❌ blocked |
| `www.parlamento.pt` | ❌ blocked |
| `glama.ai` | ❌ blocked |
| `github.com`, `raw.githubusercontent.com`, `registry.npmjs.org` | ✅ reachable |

This is an organisation egress policy on the remote environment, not a
transient failure, and the proxy documentation is explicit that it must be
reported rather than worked around.

**To unblock, do one of:**
1. Add `openar.pt` and `api.openar.pt` to the environment's network allowlist —
   see the [environment docs](https://code.claude.com/docs/en/claude-code-on-the-web).
2. Run the openAR exploration locally instead, and paste `openapi.json` into the
   repo (e.g. `docs/openar-openapi.json`) so sessions can work from it offline.
3. Point at a GitHub mirror of the spec, since GitHub is reachable.

**Option 2 is the recommendation** — vendoring the spec makes the contract
reviewable in diffs and unblocks every future session, not just this one.

### What we know about openAR so far

From web search only — **none of this is verified against the live API**, and
nothing below should be treated as fact until it is:

- Base URL `https://api.openar.pt`; OpenAPI spec at `/openapi.json`.
- **No authentication.**
- Coverage from the Constituent Assembly (1975) / 1st Legislature (1976)
  through the 17th (current).
- Roughly five datasets: **legislative initiatives, deputies, plenary votes,
  petitions, parliamentary committees**.
- An official MCP server (`@openar/mcp`) exists, which implies a stable
  documented surface.
- Rate limits, licensing/attribution terms and update cadence: **unknown**.
  All three matter before shipping.

---

## 4. Findings — repo audit, 2026-08-18

Audit of commit `eef5791`.

### Blocking

- **`src/what-was-the-vote-today.ts` is 0 bytes.** The only command has no code.
- **`ray build` reports success anyway — a false green.** esbuild compiles an
  empty module happily, but a `no-view` command with no default export fails at
  invocation. Never treat a passing build as a working extension.

### Manifest issues (block Store review — see O3)

| Field | Issue |
|---|---|
| `name` | `assembleia-da-rep-blica` — the `ú` was **dropped**, not transliterated. Should be `assembleia-da-republica`. **Permanent store URL once published — fix first.** |
| `title` | `ray lint` wants Title Case: `Assembleia Da República` |
| command `title` | lowercase `what was the vote today` → `What Was the Vote Today` |
| command `subtitle` | `what was bvoted today you know d` — placeholder, typo, trailing noise |
| `description` | duplicates the title verbatim; Store rejects non-descriptive text |
| `mode` | `no-view` — see O2 |
| `@raycast/utils` | declared but never imported |

### Not defects — environment artifacts

Two `ray lint` **errors** come from blocked network calls to raycast.com, not
from the code. Re-verify on a networked machine:
`Invalid author "caasols" — forbidden` and
`Failed compiling JSON schema: Unexpected token 'H', "Host not i"...`.

### Hygiene

- **No lockfile committed** — `package-lock.json` isn't ignored, just absent.
  raycast-buzz commits one.
- **`README.md` is a 2-line placeholder.**
- **No CI, no tests, no test tooling** — raycast-buzz has all of it.
- **`LICENSE`** reads `Copyright (c) 2026 Sol` — partial holder name.
- **`.gitignore` carries dead weight** copied from raycast-buzz: Python entries,
  `graphify-out/`, `.superpowers/`, `.next`, `.nuxt`, `.svelte-kit`, `.turbo`.
  `node_modules` is listed twice.

### Verified clean

- `assets/extension-icon.png` is **512×512 RGBA PNG** — correct.
- All dependency ranges resolve and install (170 packages, ~12s).
- `tsconfig.json` is the standard Raycast template, correct.
- ESLint and Prettier pass.

---

## 5. Reference architecture — what raycast-buzz teaches us

Studied at `caasols/raycast-buzz`. This is the template to copy.

**Layout:** `src/lib/` for pure logic (23 files), `src/components/` for shared UI
(8), `src/*.tsx` for commands (8), `test/` for the harness, `scripts/smoke.ts`
for a manual live-API check.

**Every single source file has a colocated `.test.ts(x)`.** That is the bar.

**Key mechanics worth stealing verbatim:**

- `@raycast/api` has no resolvable Node entry point, so vitest **cannot import
  or even mock it**. buzz aliases it to `test/raycast-api-stub.tsx`, a plain-DOM
  stand-in that lets tests drive real command code. This is the single biggest
  time-saver available to us.
- Coverage thresholds pinned at **100/100/100/100**, so new uncovered code fails
  the build rather than drifting.
- Split `tsconfig.test.json` adds the `DOM` lib for component tests without
  leaking browser globals into the extension.
- Scripts worth mirroring: `test`, `test:watch`, `test:coverage`, `typecheck`
  (runs *both* tsconfigs), `smoke`.
- `metadata/` holds Store screenshots; `CHANGELOG.md` is maintained.

---

## 6. Candidate commands

Derived from openAR's dataset list. **Speculative** — must be re-derived from
the real spec once §3 is unblocked. Listed to shape the roadmap, not committed.

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

## 7. Roadmap

Ordered by dependency. Phases are deliberately small per `CLAUDE.md` R2. Nothing
past P1 should start until the API is actually understood.

### P0 — Foundations *(ready now, unblocked)*
Independent of the API, so it can proceed while §3 is resolved.

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

### P1 — Understand the API *(blocked — see §3)*
- **P1.1** Obtain `openapi.json`; vendor it into the repo.
- **P1.2** Document real endpoints, response shapes, pagination, update cadence,
  rate limits and licensing/attribution in a new `## 8. API notes` section here.
- **P1.3** Settle O4 against what the data actually supports.
- **P1.4** Re-derive §6 from the real spec; kill the speculative entries.

**Done when:** every §6 command is backed by a named endpoint, or dropped.

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
