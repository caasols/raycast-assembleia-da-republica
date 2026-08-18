# PLAN — what we build next

The forward plan. Completed phases are pruned; project state, decisions and
audit findings live in **`context.md`**, and the working rules in **`CLAUDE.md`**.
Read both before starting a phase.

- **Status:** two commands shipping-shaped — `Browse Today's Votes`, `Search Initiatives`
- **Delivered:** P0 foundations · P1 API vendored · P2 client · P3 first command · P4 second command
- **Ready now:** P5 (more commands) or P6 (publishing prep)
- **Outstanding risk:** nothing has ever run against the live API — see P6.1
- **Last updated:** 2026-08-18

---

## 1. What exists

| Command | Endpoint | Notes |
|---|---|---|
| `Browse Today's Votes` | `/votacoes` | One request for the current Lisbon date; party breakdown in the detail pane |
| `Search Initiatives` | `/iniciativas` | Server-side search, throttled; opens the full-text PDF |

Shared: `openar-client.ts` (`request`, `listVotacoes`, `listIniciativas`),
`query.ts`, `errors.ts`, `dates.ts`, `votes.ts`, `initiatives.ts`, and
`components/request-empty-view.tsx`.

---

## 2. Candidate commands

Re-derived from `docs/openar-openapi.json` — every entry names a real endpoint,
with the work it actually implies. Ordered by value for effort.

| # | Command | Endpoint | Effort | Why / what it costs |
|---|---|---|---|---|
| C1 | **Browse Deputies** | `/deputados` + `/deputados/{id}` | Medium | The other half of "who did what". `situacao=ativo` gives exactly the 230 sitting members. Detail brings mandates, biography and authorship stats in one call. Photos come from a **302 to a CDN that 404s** when absent, so it needs a fallback. |
| C2 | **Browse Party Votes** | `/votacoes?a_favor=` etc. | **Low** | Reuses `listVotacoes` untouched — only a party dropdown from `/meta` and the existing list. Highest value per line of code. Answers "how did Chega vote this month". |
| C3 | **Search Petitions** | `/peticoes` | Low | Same shape as Search Initiatives. Carries signature counts and debate dates — genuinely public-interest, and nothing else surfaces it. |
| C4 | **Deputy Voting Record** | `/deputados/{id}/atividade` | High | The single most interesting command, and the hardest. Returns ~18 parallel arrays. **Verify first** whether individual votes are actually reachable — plenary votes are recorded per party, and per-deputy detail only exists inside `detalhe` as unsanitised HTML (D40). Could be a dead end. |
| C5 | **Browse Committees** | `/comissoes` + `/comissoes/{id}` | Medium | Committee → its initiatives, with rapporteurs. Narrower audience; useful for following a bill's scrutiny. |
| C6 | **Longest-Serving Deputies** | `/deputados/carreiras` | **Very low** | One endpoint, one list, aggregate stats included. Trivia rather than utility, but nearly free and a good store screenshot. |
| C7 | **Initiative Detail** | `/iniciativas/{id}?include=` | Medium | A push-view from C-anything: authors, events, per-stage votes. Must pass `include` explicitly — omitting it returns hundreds of KB. |

**Recommended next:** **C2**, then **C3**. Both reuse machinery that already
exists and tests already cover, so they add user-visible surface without adding
architecture. C1 is the natural third. Hold C4 until its data question is
answered against the live API.

---

## 3. Roadmap

### P5 — More commands
Repeat the P3/P4 shape per command: pure logic in `src/lib/`, a thin view, a
colocated test file, manifest entry with English title and Portuguese keywords.
Extract shared UI into `src/components/` on the **second** use, never in
anticipation.

### P6 — Publishing prep
- **P6.1** ⚠️ **Run `npm run smoke` on a networked machine.** Nothing in this
  repo has touched the live API; every test runs against a stubbed `fetch`.
  This is the highest-value outstanding task and blocks trusting anything else.
- **P6.2** Real `README.md` in raycast-publico's format: badges, hero image,
  a command table, and openAR credited (MIT — D20).
- **P6.3** `metadata/` screenshots — needs a working local install.
- **P6.4** `CHANGELOG.md`.
- **P6.5** Re-run `ray lint` on a networked machine: confirm the author
  validation passes, and settle **O9** — whether the Title-Case warning on
  `Assembleia da República` blocks review.
- **P6.6** `npm run publish`.

### Parked — not committed
Vote notifications, a menu-bar command for live sittings, preferences (default
party, legislature), offline caching, AI-extension `tools` over openAR's MCP
server. Recorded so they are not re-litigated as fresh ideas.
