# PLAN — what we build next

The forward plan. Completed phases are pruned; project state, decisions and
audit findings live in **`context.md`**, and the working rules in **`CLAUDE.md`**.
Read both before starting a phase.

- **Status:** seven commands plus three pushed detail views, paginated, 343 tests at 100% coverage
- **Next:** Track B — everything in Track A is done
- **Needs you:** B1 `npm run smoke` — validates everything above it
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

Two tracks. **Track A** needs nothing from the author and is ordered so each
item makes the next one cheaper. **Track B** needs a networked or installable
machine, and is deliberately last — but B1 is the one that validates everything
in Track A, so it should happen as soon as a laptop is to hand.

---

### Track A — ✅ complete

#### A1 · Retry action on error states ✅ *done*
A failed request currently means re-running the whole command. With a 100
req/min budget, a transient 429 is the *expected* failure, not an exotic one —
and the one thing a user can do about it is exactly what the UI doesn't offer.

`RequestEmptyView` is the single place to add it, so all seven lists and the
three detail views gain it at once. Cheapest item on the list and it compounds.

#### A2 · Legislature filter ✅ *done*
**Today the extension can only see the present.** Nothing filters by
legislature, so every command implicitly shows the current one — while openAR
carries the record back to 1976. This is the difference between "what is
parliament doing" and "what has parliament ever done".

Needs `listLegislaturas()` first — the endpoint is **not implemented**; only the
`legislaturas` field nested inside other responses is. Then a shared
`useLegislatures` hook and a dropdown, following the `useParties` shape.

`dataFim: null` identifies the current legislature, so the default stays correct
without hardcoding `XVII` — which goes stale at the next election.

#### A3 · Default-legislature preference ✅ *done*
Same session as A2 ideally: the dropdown and the preference are the same
decision seen twice, and `pageSize` already established the pattern.

#### A4 · AI extension `tools` ✅ *done*
Raycast's AI can call extension tools directly, so *"how did PS vote on the
budget?"* is answerable without opening a command. Nothing else on this list
changes what the extension **is**.

Deliberately after A2: tools that cannot express "in the XV legislature" would
need rewriting the moment legislature filtering lands. Building on the finished
data model costs less than retrofitting it.

#### A5 · ETag caching on detail views ✅ *done — but see the caveat*
The client models weak ETags in `OPENAR-API.md` §4 and implements none of them.
`/iniciativas/{id}` and `/peticoes/{id}` would return 304s.

⚠️ **Verified against a stubbed 304, never a real one.** The tests prove the
client sends `If-None-Match`, handles a 304 before the `!ok` check, and reuses
the held body — but openAR has never actually returned one to us. Worth
re-checking during B1.

---

### Track B — needs a networked or installable machine

#### B1 · Run `npm run smoke` ⚠️ *do this first of all*
Nothing in this repo has ever touched the live API. 343 tests all run against a
stubbed `fetch`, so the base URL, envelope handling, pagination arithmetic and
the 429 path are verified against *our reading of the spec*.

**This validates the foundation every other item sits on.** If the client is
wrong, all seven commands are wrong in the same way. Worth ten minutes before
any more building.

#### B2 · Answer the Deputy Voting Record question
One live request settles whether P10.1 is buildable at all: plenary votes are
recorded per party, and individual names may exist only inside `detalhe`, the
unsanitised AR HTML we do not render (D40). Cheap to check while B1 is open;
expensive to discover after building it.

#### B3 · `metadata/` screenshots
Store review requires them. Hard blocker on submission, and it needs a working
`npm run dev`.

#### B4 · Settle O9 and re-run `ray lint` networked
Whether store review accepts `Assembleia da República` as the title. CI already
runs `ray lint`, so the first green Actions run may answer it for free.

#### B5 · `npm run publish`

---

### Parked — not committed
Vote notifications, offline caching, per-command preferences. Recorded so they
are not re-litigated as fresh ideas.
