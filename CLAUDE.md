# CLAUDE.md — working agreement

Operating rules for any Claude session in this repo. Read this first, every
session. Four tracked documents, four jobs — keep them in their lanes:

| File | Holds |
|---|---|
| **`CLAUDE.md`** (this file) | *How we work* — standing rules, conventions, test mechanics |
| **`context.md`** | *What we know* — project context, decision log, open questions, blockers, audit findings |
| **`PLAN.md`** | *What we do next* — forward-only, undone work exclusively |
| **`OPENAR-API.md`** | *What the API does* — the openAR contract and its traps |
| **`docs/openar-openapi.json`** | The full OpenAPI 3.1 spec — source of truth when the prose is ambiguous |

The repo is **private**, so internal working notes belong here rather than in a
side channel. Keep credentials out regardless.

**Keep them in their lanes literally.** `PLAN.md` is forward-only: an item is
*deleted* when it lands, not ticked and left in place, and the record of what
shipped belongs in `context.md` §1.1. The plan had drifted into carrying a
"What exists" section before this rule was written down (`context.md` D99).

---

## 1. Ground rules

These are the standing instructions. They apply to every task, including small
ones, unless the user explicitly waives them for a given piece of work.

### R1 — Plan and brainstorm before building
No implementation before a written plan. Every non-trivial task starts with a
brainstorm of the possible approaches, not the first one that comes to mind.
Write it down — roadmap items in `PLAN.md`, decisions in `context.md` — before
touching code.

### R2 — Break work down as far as it will go
Decompose aggressively. A task that cannot be described in one sentence is not
yet broken down. Prefer many small, independently testable, independently
reviewable units over one large change. Each unit should be shippable on its
own and have a clear "done" condition.

The corollary bites harder than the rule: **do not mark a whole unit blocked
because one facet of it is uncertain.** Deputy Activity sat on the roadmap as
"blocked" while 17 of the endpoint's 18 arrays needed nothing unverified — the
uncertainty was one array, and the block should have been scoped to it
(`context.md` D89).

### R3 — Pros and cons for every option
When there is more than one way to do something — and there usually is —
enumerate the realistic options and give each an honest pros/cons treatment.
No strawman options. State the trade-off that actually decides it, then give a
single clear recommendation rather than leaving a menu on the table.

### R4 — Self-audit before proceeding
Before acting on a plan, audit it and say what the audit found: what could go
wrong, what is being assumed, what is unverified, what the plan does *not*
cover. Then give a recommendation. The order is always
**plan → options with pros/cons → self-audit → recommendation → confirm → build.**
Do not skip to build because the task looks obvious.

### R5 — Unit tests and high coverage, always
Tests are part of the work, not a follow-up. Every new module ships with its
colocated test file in the same change. Coverage thresholds are enforced in CI
and in `vitest.config.ts` — a change that drops coverage fails, it does not get
waved through. See §3 below for the mechanics.

### R6 — Report honestly
If something is blocked, unverified, or was skipped, say so plainly and say
why. Never present an unverified assumption as a finding.

**Green CI and runtime evidence answer different questions** — a formulation
borrowed from `block/buzz`'s own agent guide, and the exact lesson this repo
already taught: `ray build` compiled a 0-byte command file and reported
success. Scale validation to the change's risk, and exercise the real workflow
for user-visible behaviour when practical. See `context.md` §4.

---

## 2. Project shape

A Raycast extension consuming **openAR** (`api.openar.pt`) — open data from the
Assembleia da República, the Portuguese parliament. No authentication required.

Two reference repos, and they are **not** the same thing — don't confuse them:

| Repo | What it is | Use it for |
|---|---|---|
| [`caasols/raycast-buzz`](https://github.com/caasols/raycast-buzz) | The **Raycast extension** | Structure, conventions, test strategy. This is the template. |
| [`block/buzz`](https://github.com/block/buzz) | The **Buzz product itself** — Rust workspace (~20 crates: relay, core, db, auth, search, media, agent) plus desktop/mobile/web. No Raycast code anywhere. | Contributor-guide and testing-doc conventions only. |

A third repo, [`caasols/raycast-publico`](https://github.com/caasols/raycast-publico),
is the author's other **published** Raycast extension and sets the house style
for anything store-facing: English command titles in `Browse X` form, the brand
name as `subtitle`, and Portuguese `keywords` (accented *and* unaccented) so
search works in either language. It also shows the CI shape and README format
that got through store review.

When in doubt about **layout and tests**, match `raycast-buzz`; when in doubt
about **manifest, copy or store presentation**, match `raycast-publico`. Where
they disagree — buzz colocates tests, publico uses `src/__tests__/` — buzz wins
(`context.md` D32).

### Directory layout

```
src/
  <command-name>.tsx        one root command per file, name matching package.json
  <command-name>.test.tsx
  lib/                      pure logic — no JSX, no Raycast UI imports
    openar-client.ts        the ONLY module that calls fetch
    query.ts                query building, clamping, the API's input limits
    pagination.ts           Raycast's zero-based page ↔ openAR's one-based
    preferences.ts          reads the generated `Preferences` type
    errors.ts types.ts dates.ts
    <entity>.ts             presentation helpers: votes, initiatives, deputies…
  components/               shared React — UI *and* hooks
    request-empty-view.tsx  the three ways a list shows nothing
    use-parties.ts          /meta party lists, scoped per endpoint
    <entity>-detail.tsx     pushed detail views
  tools/                    AI-extension tools, one per file
    <tool-name>.ts          default-exported async fn + Input type
test/
  raycast-api-stub.tsx      stand-in for @raycast/api under vitest
  fixtures.ts               shared entity builders (vote, initiative, …)
  setup.ts                  jest-dom matchers + per-test cache reset
scripts/smoke.ts            hits the real API, run manually
docs/openar-openapi.json    vendored spec, the contract's source of truth
```

`components/` holds hooks as well as components: they are the shared *React*
layer, and `lib/` is the part with no React in it at all.

`src/tools/` is the AI-extension surface. Each file default-exports one async
function and declares its own `Input` type; every entry needs a matching object
in `package.json`'s `tools` array, keyed by filename. Tools import the same
`lib/` helpers the commands do — that is the point, since a tool and a command
that disagreed about what "approved" means would be worse than having no tool.

### Architectural rules

- **Keep logic out of commands.** Anything that can be a pure function in
  `src/lib/` belongs there, where it is trivially unit-testable. Command files
  should be thin: fetch, wire, render.
- **One command per file**, filename matching the `name` in `package.json`.
- **All network access goes through a single client module** in `src/lib/`.
  Commands never call `fetch` directly.
- **Errors funnel through one helper** (`src/lib/errors.ts` in buzz) so a
  caught `unknown` never renders as `[object Object]`.
- **Comment the *why*, not the *what*.** Match the density and voice of
  raycast-buzz — it explains non-obvious decisions and fidelity trade-offs
  inline, and that is the house style.
- **Extract on the second use, never in anticipation.** `RequestEmptyView`,
  `voteResultIcon` and `useParties` were each extracted the moment a second
  caller appeared — and the two party dropdowns were deliberately *not* merged,
  because they only look alike (D54).
- **A list that goes nowhere is unfinished.** Rows push into a detail view where
  the API offers one.
- **Never invent a number a user might reasonably want to choose.** Page sizes
  come from the `pageSize` preference, not from constants (D67).

---

## 3. Testing

Test stack, inherited from raycast-buzz:

| Tool | Purpose |
|---|---|
| `vitest` | runner |
| `@vitest/coverage-v8` | coverage |
| `@testing-library/react` + `jsdom` | component tests |
| `@testing-library/jest-dom` | matchers, registered in `test/setup.ts` |
| `tsx` | runs `scripts/smoke.ts` |

**`@raycast/api` cannot be imported under vitest.** The real package is injected
by the Raycast runtime and exposes no resolvable Node entry point, so Vite
cannot load it — not even to mock it. `vitest.config.ts` aliases it to
`test/raycast-api-stub.tsx`, which renders plain DOM so tests drive real command
code. Extend that stub when a command needs an API surface it doesn't yet cover.

**Coverage thresholds are 100%** on statements, branches, functions and lines,
so new uncovered code fails `npm run test:coverage` rather than quietly
drifting. The project currently sits at that bar — **462 tests across 42 files**
— so a drop is a regression, not a starting point to work up from. Exclude only
files that emit no runtime code (e.g. a types-only `types.ts`), and say so in a
comment where excluded.

Commands to keep green:

```
npm run lint          # ray lint
npm run typecheck     # both tsconfig.json and tsconfig.test.json
npm run test          # vitest run
npm run test:coverage # vitest run --coverage, enforces thresholds
npm run build         # ray build
```

`tsconfig.test.json` is separate on purpose: it adds the `DOM` lib for the
component tests without letting the extension itself see browser globals. The
main `tsconfig.json` **excludes** the test files and declares `types` explicitly
— without both, `tsc --noEmit` checks the tests without the DOM lib and every
jest-dom matcher fails to resolve.

**Extend the stub rather than weakening an assertion.** It has grown
`List.Item.Detail`, `List.Dropdown`, `Detail`, `Cache`, pagination and icon
`fallback` serialisation, each added because a real behaviour was otherwise
invisible to a test. Stub-only helpers such as `__resetCaches` are imported from
`../test/raycast-api-stub` directly — the real `@raycast/api` has no such export,
and `tsc` checks against the real one.

**`test/setup.ts` resets the cache before every test.** `useCachedPromise` keeps
a module-level `Cache` that outlives a test; two tests were once passing on the
*previous* test's data.

**CI order is load-bearing: lint → build → typecheck → coverage.** Only
`ray build` generates `raycast-env.d.ts` (verified — `ray lint` does not), and
that file is gitignored but holds the `Preferences` type, so typechecking first
fails on a clean checkout.

**CI is green and that is now a verified statement**, not an assumption — it
runs on every branch and on pull requests (`context.md` D92/D94). Cite a run
only after checking one exists.

---

## 4. Gotchas

Each of these has already cost time once.

- **`ray build` succeeding proves almost nothing.** It compiled a 0-byte command
  file and reported success. Trust tests, not the build.
- **No check in the toolchain can see a placeholder asset.** The scaffold's
  generic icon was a valid 512×512 PNG, so `ray lint`, `ray build` and CI passed
  it for thirty commits (`context.md` D98). Assets are verified by looking at
  them — the 0-byte command file's lesson in a different costume.
- **The API base URL is `https://api.openar.pt/v1`.** The `/v1` lives in
  `servers[0].url`, not in the documented paths. Omitting it 404s everything.
- **`estado` is a stage, not a verdict.** `Aprovado` is not a valid
  `/iniciativas?estado=` value — use `resultado=aprovado`. And `resultado` is
  capitalised on `/votacoes` but lowercase on `/iniciativas`.
- **Vote ids are unique per initiative, not globally.** `/votacoes/{id}` requires
  an `iniciativa_id`; the real key is the pair.
- **The five institutional authors** (`Governo`, `PAR`, `Madeira`, `Açores`,
  `Mesa`) are valid on `/iniciativas` and `/votacoes` but **400 on
  `/deputados`**. Use `useParties("members")` there.
- **Raycast pages are zero-based, openAR's start at 1** — and openAR *clamps*
  page 0 up to 1, so an off-by-one shows as a list that silently repeats its
  first page. Always go through `toApiPage`.
- **`limit` caps at 200 but there are 230 sitting deputies**, so no single
  request can return them all.
- **Omitting `include` on a detail endpoint** returns every relation — hundreds
  of KB. Always pass it explicitly.
- **Don't redeclare the `Preferences` type.** The generated one keeps its literal
  union; a hand-written copy widens to `string` and drifts.
- **Network egress is restricted in remote dev containers.** `openar.pt`,
  `api.openar.pt`, `parlamento.pt` and Raycast's own docs are blocked. Do not
  route around it — report it. Work from `OPENAR-API.md` and the vendored spec.
- **A workflow that only triggers on `main` never runs.** Development happens on
  feature branches that may never open a PR, and CI sat at *zero* registered
  runs for twenty-nine commits while every session assumed it was green. Check
  that a run exists before citing one (`context.md` D92).
- **`keywords` cap at 12 items per command** — a hard `ray lint` **error**, and
  invisible locally: the manifest schema is fetched from raycast.com, which the
  dev container blocks. Anything schema-shaped can only be trusted after CI.
- **Not every `ray lint` complaint fails the build.** The Title-Case grumble
  about the extension title is a `warning`; the keyword cap was the error. Read
  the severity before rewriting copy to satisfy it.
- **A computed object key silently defeats TypeScript's excess-property
  check.** `listVotacoes({[how]: sigla})` with `how = "a_favor"` compiled
  cleanly against a params type whose field is `aFavor` — the filter vanished
  and the default state of Browse Party Votes showed the whole archive as one
  party's votes (`context.md` D101). When a UI id maps onto a client parameter,
  write the mapping out explicitly, and test *every* branch of it — the two
  branches that were tested worked; the untested one was the default.
- **All four docs are tracked** (`context.md` D14/D18). The repo is private.
  Keep credentials out regardless.
