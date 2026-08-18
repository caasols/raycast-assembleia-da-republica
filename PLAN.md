# PLAN — what we build next

The forward plan. Completed phases are pruned; project state, decisions and
audit findings live in **`context.md`**, and the working rules in **`CLAUDE.md`**.
Read both before starting a phase.

- **Status:** seven commands shipping-shaped
- **Delivered:** P0 foundations · P1 API vendored · P2 client · P3–P5 seven commands
- **Ready now:** P6 (publishing prep) — C4 Deputy Voting Record is the only command left, and it is blocked on a data question
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
