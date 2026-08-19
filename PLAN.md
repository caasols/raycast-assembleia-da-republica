# PLAN — what we build next

The forward plan. Completed phases are pruned; project state, decisions and
audit findings live in **`context.md`**, and the working rules in **`CLAUDE.md`**.
Read both before starting a phase.

- **Status:** seven commands, navigable and paginated
- **Delivered:** P0 foundations · P1 API vendored · P2 client · P3–P5 seven commands
- **Ready now:** P8 (polish) or P9 (AI tools). P6 is blocked on a local install.
- **Outstanding risk:** nothing has ever run against the live API — see P6.1
- **Last updated:** 2026-08-18

---

## 1. What exists

| Command | Endpoint |
|---|---|
| `Browse Today's Votes` | `/votacoes` filtered to the current Lisbon date |
| `Search Initiatives` | `/iniciativas` |
| `Browse Party Votes` | `/votacoes` filtered by `a_favor`/`contra`/`abstencao` |
| `Search Petitions` | `/peticoes` |
| `Browse Deputies` | `/deputados?situacao=ativo` |
| `Browse Committees` | `/comissoes` |
| `Browse Longest-Serving Deputies` | `/deputados/carreiras` |

`src/lib/`: `openar-client` (8 endpoints), `query`, `errors`, `types`, `dates`,
`votes`, `initiatives`, `petitions`, `deputies`, `careers`.
`src/components/`: `request-empty-view`, `vote-result-icon`.

## 2. Remaining command

| Command | Endpoint | Status |
|---|---|---|
| **Deputy Voting Record** | `/deputados/{id}/atividade` | ⚠️ **Blocked on a data question.** Returns ~18 parallel arrays, but plenary votes are recorded *per party*, not per deputy — individual names appear only inside `detalhe`, the unsanitised AR HTML we decided not to render (D40). **Verify against live data whether per-deputy votes are reachable at all before building it.** It may be a dead end. |

Also possible, if a detail view is wanted later: **Initiative Detail**
(`/iniciativas/{id}?include=`) as a push-view from any list. Must pass
`include` explicitly — omitting it returns hundreds of KB.

## 3. Roadmap

### P7 — Make the lists navigable *(Tier 1)* ✅ complete
Every command is currently a flat list with no `Action.Push` anywhere: you find
a committee, a deputy, an initiative, and there is nowhere to go. Half the
API's endpoints are detail endpoints and none are wired up.

- **P7.1** ✅ **Initiative Detail** — pushed from Search Initiatives and both
  vote commands. Authors, every stage with its votes and publications. `include`
  always explicit (D59).
- **P7.2** ✅ **Deputy Detail** — mandates, biography, authorship stats and
  recent initiatives, pushed from Browse Deputies.
- **P7.3** ✅ **Committee Detail** — the initiatives that passed through a
  committee, each pushing further into Initiative Detail (D61).
- **P7.4** ✅ **Pagination** — infinite scroll on all six unbounded lists via
  Raycast's `List.pagination` (D62). Fixed a real bug on the way: 30 of the 230
  sitting deputies were unreachable, since `limit` caps at 200 (D64).

### P8 — Polish *(Tier 2)*
- **P8.1** Retry action on error states — a failed request currently means
  re-running the whole command.
- **P8.2** Legislature filter — everything is implicitly the current
  legislature. `/legislaturas` exists and `dataFim: null` identifies the
  current one without hardcoding `XVII`.
- **P8.3** Preferences — default legislature, results per page.
- **P8.4** ETag caching on detail views. The client already models weak ETags
  (`OPENAR-API.md` §4); nothing uses them yet.

### P9 — New surface *(Tier 3)*
- **P9.1 AI extension `tools`** — Raycast's AI can call extension tools
  directly, so "how did PS vote on the budget?" is answerable without opening a
  command. openAR also ships an MCP server. The genuine differentiator.
- **P9.2 Menu-bar command** for live sittings.

### P10 — Blocked on live data
- **P10.1 Deputy Voting Record** — `/deputados/{id}/atividade`. Plenary votes
  are recorded per party, not per deputy; individual names appear only inside
  `detalhe`, the unsanitised AR HTML we do not render (D40). **Verify whether
  per-deputy votes are reachable at all before building.** May be a dead end.

### P6 — Publishing prep *(carried forward)*
- **P6.1** ⚠️ **Run `npm run smoke` on a networked machine.** Nothing has
  touched the live API; every test runs against a stubbed `fetch`. Highest
  outstanding risk.
- **P6.3** ⚠️ `metadata/` screenshots — blocked, needs a working local install.
  Store review requires them, so this gates submission.
- **P6.5** Re-run `ray lint` networked: confirm author validation passes and
  settle **O9** (the Title-Case warning on `Assembleia da República`). CI now
  runs `ray lint`, so the first green/red run answers this.
- **P6.6** `npm run publish`.

### Parked — not committed
Vote notifications, a menu-bar command for live sittings, preferences (default
party, legislature), offline caching, AI-extension `tools` over openAR's MCP
server. Recorded so they are not re-litigated as fresh ideas.
