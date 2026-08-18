# context.md — project state and knowledge

What we know: what we're building, every decision taken, what's blocked, and
what the audit found. This is the **living record** — append to it as we go.

Companion documents:

| File | Holds | Read it when |
|---|---|---|
| **`CLAUDE.md`** | *How we work* — the standing rules (R1–R6), architecture conventions, test mechanics | Start of every session |
| **`context.md`** (this file) | *What we know* — project context, decision log, open questions, blockers, audit findings | Before proposing anything |
| **`PLAN.md`** | *What we do next* — candidate commands and the phased roadmap | When picking up work |

Decisions are append-only: add, don't rewrite. All three files are tracked in
git (D14) — the repo is **private**, so internal working notes are fine here.
Keep credentials out regardless.

- **Repo:** `caasols/raycast-assembleia-da-republica` (private)
- **Reference implementation:** [`caasols/raycast-buzz`](https://github.com/caasols/raycast-buzz)
- **Last updated:** 2026-08-18

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
| D15 | 2026-08-18 | **Three tracked docs with separate jobs:** `CLAUDE.md` (how we work) / `context.md` (what we know) / `PLAN.md` (what we do next). Partially reverses D9 — `context.md` is restored rather than retired. | The user works from a `CLAUDE.md` + `context.md` pair and needs both present to build on as we go. Splitting state from forward-plan keeps one source of truth per question instead of duplicating decisions across two files. | Settled |
| D17 | 2026-08-18 | **Vendor the openAR API reference into the repo** as `OPENAR-API.md` | The live spec is unreachable from dev containers, so the contract is transcribed from the official reference PDF and committed. Makes the API contract reviewable in diffs and unblocks every future session. Capture is **partial** — see O8. | Settled |
| D16 | 2026-08-18 | Internal working docs live in the repo | **The repo is private** — checked, not assumed. D6's premise ("never published to the public repo") was simply wrong: there is no public repo. Nothing here is secret-bearing anyway. | Settled |
| D14 | 2026-08-18 | **`CLAUDE.md` and `context.md` are now tracked in git** | Supersedes D6/D8 for these two files. User asked for them in the GitHub repo. Removed from `.gitignore`; `docs/` and `PROJECT_BRIEF.md` stay ignored. Neither contains secrets. | Settled |

### Open questions

| # | Question | Why it matters | Blocks |
|---|---|---|---|
| O2 | `no-view` or `view` for the vote command? | Determines `.ts` vs `.tsx` and the whole command shape. `no-view` can only fire a HUD/toast — too thin for a list of votes. **Recommendation: `view`.** | P2 |
| O3 | Raycast Store, or private use? | Store review enforces naming, description, README and screenshot rules. If private, most manifest findings drop to cosmetic and P5 disappears. | P5 |
| O4 | Scope of "today" — plenary only, or committees too? Behaviour on a non-sitting day? | Shapes queries and the empty state | P1, P3 |
| O5 | Windows **and** macOS, or macOS only? | D2 claims both; raycast-buzz ships macOS-only. Cross-platform means no macOS-only APIs and doubles manual test surface. | P2, P5 |
| O6 | Portuguese or English UI copy? Both? | Data arrives in Portuguese. Mixed-language UI reads badly; an English UI over Portuguese content is a real trade-off. Store listings skew English. | P3 |
| O8 | What are the `/votacoes`, `/peticoes` and `/comissoes` contracts? | The supplied PDF truncated mid-`/iniciativas`; these three endpoints are confirmed to exist but were not captured. **`/votacoes` backs the extension's first planned command**, so this blocks P3. Fix: re-export the full reference page, or commit `openapi.json` from an unblocked machine. | P3 |
| O7 | What do the pre-existing iCloud `CLAUDE.md` / `context.md` contain? | They may hold decisions from local sessions that this log has never seen. The 2026-08-18 upload delivered macOS bookmark alias stubs (2.5 KB Apple binary plists), not file contents — see §3.1. Until recovered, this log may be missing history. | — |

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
reported rather than worked around. **Re-tested 2026-08-18 after being given
the `https://api.openar.pt/` URL directly — still blocked.** Supplying the URL
does not help; the block is on the host, not on knowing the address.

**Partially mitigated 2026-08-18:** the official API reference was supplied as a
PDF and transcribed into **`OPENAR-API.md`** (D17). Base URL, auth, rate limits,
caching, pagination and 9 endpoints are now documented offline. **The capture is
incomplete** — see O8.

**To unblock fully, do one of:**
1. Add `openar.pt` and `api.openar.pt` to the environment's network allowlist —
   see the [environment docs](https://code.claude.com/docs/en/claude-code-on-the-web).
2. Run the openAR exploration locally instead, and paste `openapi.json` into the
   repo (e.g. `docs/openar-openapi.json`) so sessions can work from it offline.
3. Point at a GitHub mirror of the spec, since GitHub is reachable.

**Option 2 is the recommendation** — vendoring the spec makes the contract
reviewable in diffs and unblocks every future session, not just this one.

### 3.1 Secondary blocker — iCloud docs not recovered

An attempt to restore the original `CLAUDE.md` and `context.md` from iCloud
delivered **macOS bookmark alias stubs**, not the files: both uploads are
2.5 KB Apple binary property lists (`NSKeyedArchiver` / `NSURL` bookmark data)
pointing at
`/private/var/mobile/Library/Mobile Documents/com~apple~CloudDocs/Documents/raycast-assembleia-da-republica/`.
They contain zero markdown.

This is the standard iOS Files behaviour when a file is in iCloud but not
downloaded locally — sharing hands over a reference instead of the content.

**To recover:** open each file in the Files app first so it downloads fully
(the cloud-with-arrow icon disappears), *then* share it — or simply paste the
contents into chat, or upload from a Mac with iCloud Drive synced. Tracked as O7.

### What we know about openAR

**Superseded by `OPENAR-API.md`**, which is transcribed from the official
reference rather than inferred. The summary below is retained only as the
pre-D17 record of what was assumed before the real contract arrived — several
guesses in it turned out wrong (rate limits and licensing were listed as
"unknown"; they are documented). Read `OPENAR-API.md` instead.

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
