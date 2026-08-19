# PLAN — what we build next

The forward plan. Completed phases are pruned; project state, decisions and
audit findings live in **`context.md`**, and the working rules in **`CLAUDE.md`**.
Read both before starting a phase.

- **Status:** seven commands plus three pushed detail views, paginated, 343 tests at 100% coverage
- **Ready now:** P8 (polish) or P9 (AI tools)
- **Outstanding risk:** nothing has ever run against the live API — `context.md` §3 B1
- **Last updated:** 2026-08-19

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

## 2. Roadmap — what is left

Delivered and pruned: P0 foundations · P1 API vendored · P2 client · P3–P5 seven
commands · P6.2/6.4 README and changelog · P7 navigation and pagination ·
P8.3 page-size preference. See `context.md` §2 for why each was done the way it
was.

### P8 — Polish
- **P8.1 Retry action on error states.** A failed request currently means
  re-running the whole command. `RequestEmptyView` is the one place to add it,
  so every list gains it at once.
- **P8.2 Legislature filter.** Everything is implicitly the current legislature.
  `/legislaturas` exists and `dataFim: null` identifies the current one without
  hardcoding `XVII` — which will otherwise go stale at the next election.
- **P8.3b Default-legislature preference.** Pairs with P8.2; the page-size half
  of P8.3 is done.
- **P8.4 ETag caching on detail views.** The client already models weak ETags
  (`OPENAR-API.md` §4) and nothing uses them. `/iniciativas/{id}` and
  `/peticoes/{id}` would return 304s.

### P9 — New surface
- **P9.1 AI extension `tools`.** Raycast's AI can call extension tools directly,
  so "how did PS vote on the budget?" is answerable without opening a command.
  openAR also ships an MCP server. The genuine differentiator, and nothing else
  on this list changes what the extension *is*.
- **P9.2 Menu-bar command** for live sittings.

### P10 — Blocked on live data
- **P10.1 Deputy Voting Record** — `/deputados/{id}/atividade`. Plenary votes are
  recorded per party, not per deputy; individual names appear only inside
  `detalhe`, the unsanitised AR HTML we do not render (D40). **Verify whether
  per-deputy votes are reachable at all before building** — it may be a dead end,
  and finding that out afterwards would waste the work.

### P6 — Publishing *(blocked on a local install)*
- **P6.1** ⚠️ Run `npm run smoke`. Nothing has touched the live API; see
  `context.md` §3 B1. Highest outstanding risk.
- **P6.3** ⚠️ `metadata/` screenshots — Store review requires them.
- **P6.5** Re-run `ray lint` networked: confirm the author validation passes and
  settle **O9** (§3 B3).
- **P6.6** `npm run publish`.

### Parked — not committed
Vote notifications, offline caching, per-command preferences. Recorded so they
are not re-litigated as fresh ideas.
