# CLAUDE.md — working agreement

Operating rules for any Claude session in this repo. Read this first, every
session. Three tracked documents, three jobs — keep them in their lanes:

| File | Holds |
|---|---|
| **`CLAUDE.md`** (this file) | *How we work* — standing rules, conventions, test mechanics |
| **`context.md`** | *What we know* — project context, decision log, open questions, blockers, audit findings |
| **`PLAN.md`** | *What we do next* — candidate commands, phased roadmap |
| **`OPENAR-API.md`** | *What the API does* — the openAR contract and its traps |
| **`docs/openar-openapi.json`** | Full OpenAPI 3.1 spec — source of truth when the prose is ambiguous |

The repo is **private**, so internal working notes belong here rather than in a
side channel. Keep credentials out regardless.

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

### Directory layout (mirrors raycast-buzz)

```
src/
  <command-name>.tsx        one file per command, named to match package.json
  <command-name>.test.tsx
  lib/                      pure logic: API client, parsing, formatting, errors
    <module>.ts
    <module>.test.ts
  components/               shared UI used by more than one command
    <component>.tsx
    <component>.test.tsx
test/
  raycast-api-stub.tsx      stand-in for @raycast/api under vitest
  setup.ts                  registers jest-dom matchers
scripts/
  smoke.ts                  hits the real API, run manually
```

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

**Coverage thresholds are set to 100%** in raycast-buzz on statements, branches,
functions and lines, so new uncovered code fails `npm run test:coverage` rather
than quietly drifting. Start this project at the same bar. Exclude only files
that emit no runtime code (e.g. a types-only `types.ts`), and say so in a
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
component tests without letting the extension itself see browser globals.

---

## 4. Gotchas

- **`ray build` succeeding proves almost nothing.** It compiled a 0-byte
  command file and reported success. A `no-view` command with no default export
  builds clean and fails at invocation. Trust tests, not the build.
- **All three docs are tracked** (`context.md` D14/D15). `docs/` and
  `PROJECT_BRIEF.md` remain ignored. Keep secrets out of all four regardless.
- **Network egress is restricted in remote dev containers.** `openar.pt`,
  `api.openar.pt` and `parlamento.pt` are currently blocked by the egress
  proxy. Do not try to route around it — report it. See `context.md` §3.
  Work from `OPENAR-API.md` and `docs/openar-openapi.json` instead — the
  contract is fully vendored, so no session needs network access to know it.
- **`estado` is not a verdict.** `Aprovado` is not a valid `/iniciativas?estado=`
  value — use `resultado=aprovado`. See `OPENAR-API.md` §14.
- **The API base URL is `https://api.openar.pt/v1`** — the `/v1` is in
  `servers[0].url`, not in the documented paths. Omitting it 404s everything.
- **Vote ids are unique per initiative, not globally.** `/votacoes/{id}` requires
  an `iniciativa_id`; the real key is the pair. See `OPENAR-API.md` §8.
- **The `name` field in `package.json` is permanent after publishing** — it
  becomes the store URL. It is currently misspelled. Fix before first publish.
