# PLAN — what we build next

The forward plan. **Only undone work lives here** — completed phases are pruned
the moment they land. Project state, decisions and audit findings are in
**`context.md`**; the working rules are in **`CLAUDE.md`**. Read both before
starting an item.

- **Status:** seven commands, five pushed detail views, nine AI tools, 462 tests at 100% coverage
- **CI:** green — run #2 on `0de59c7`, the first run in the project's history (`context.md` D92/D94)
- **Next:** A6 — the extension still ships Raycast's placeholder icon
- **Needs you:** B1 `npm run smoke`, which validates everything built so far
- **Outstanding risk:** nothing has ever run against the live API (`context.md` §3 B1)
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

Every list pushes into a detail view: initiative, deputy, deputy activity,
committee, petition. **Nine AI tools** in `src/tools/`. `src/lib/` carries the
client (13 endpoints), query building, pagination, preferences, errors, the
ETag store and the per-entity presentation helpers.

## 2. Roadmap — what is left

Re-prioritised 2026-08-19 after the first CI run. Two changes from the previous
ordering: **the old B4 is gone** — CI answered O9 for free, exactly as D29
predicted once a run actually happened — and **A6 is new**, found by auditing
what store submission needs rather than what the code needs.

**Track A** needs nothing from the author. **Track B** needs a networked or
installable machine and is deliberately last — except that B1 validates
everything in Track A, so it should happen as soon as a laptop is to hand.

---

### Track A — can be done here

#### A6 · Replace the placeholder extension icon ⬅ *next*
`assets/extension-icon.png` is still the generic red chip Raycast's scaffold
generates — unchanged since commit `f20313a`. It is 512×512 and technically
valid, so no lint or build catches it, but shipping a template icon to the store
is the most visible possible sign that nobody finished the extension.

**A hard submission blocker, and the only one that does not need the author.**
Pillow is available in this container, so the artwork can be produced here and
reviewed as a committed PNG.

Brainstorm the mark before drawing anything (R1): the obvious candidates are the
Palácio de São Bento's colonnade, a ballot/vote glyph, and the Portuguese
armillary sphere. The last one is state iconography and is best avoided —
looking official for an unofficial extension is a liability, not a feature.

#### A7 · CHANGELOG omits the AI tools
`CHANGELOG.md` lists the seven commands and stops. The nine tools are the whole
AI-extension surface and a reader of the store page learns nothing about them.
Ten minutes, no dependencies — worth doing in whatever session touches A6.

---

### Track B — needs a networked or installable machine

#### B1 · Run `npm run smoke` ⚠️ *do this first of all*
Nothing in this repo has ever touched the live API. All 462 tests run against a
stubbed `fetch`, so the base URL, envelope handling, pagination arithmetic and
the 429 path are verified against *our reading of the spec*.

**This validates the foundation every other item sits on.** If the client is
wrong, all seven commands are wrong in the same way. Ten minutes.

Two things to check in the same session, since the connection is already open:

- **A real `304`.** A5's ETag work is verified against a *stubbed* 304 only —
  the client provably sends `If-None-Match` and reuses the held body, but openAR
  has never actually returned one to us.
- **B2 below**, which is one request.

#### B2 · Do per-deputy vote positions exist? *(one request, fold into B1)*
Narrowed to a single array. `actp` is described as *"outras actividades em
plenário (votos, etc.)"* and its element shape is undeclared, so it is the only
place an individual vote position could live — the alternative being that they
exist only inside `detalhe`'s unsanitised HTML (D40). One live request against a
long-serving deputy settles it.

Until then both the view and the tool say plainly that plenary votes are
recorded per party, so the absence reads as a property of the data rather than a
missing feature (D91).

#### B3 · `metadata/` screenshots
Store review requires them; the directory does not exist yet. Needs a working
`npm run dev`, and should come after B1 so the screenshots show real data rather
than an error state.

#### B4 · `npm run publish`
Last. Everything above is a precondition.

---

### Parked — not committed
Vote notifications, offline caching, per-command preferences. Recorded so they
are not re-litigated as fresh ideas.
