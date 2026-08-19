# PLAN — what we do next

The forward plan, and **only** the forward plan: an item is deleted from this
file the moment it lands. What already exists is inventoried in `context.md` §1;
decisions and blockers live there too, and the working rules in `CLAUDE.md`.

- **Next:** B1 — everything that could be done without the author is done
- **Outstanding risk:** nothing here has ever run against the live API (`context.md` §3 B1)
- **Last updated:** 2026-08-19

---

## Track B — needs a networked or installable machine

Ordered by dependency, not by size. B1 first because everything else is worth
less until it passes.

### B1 · Run `npm run smoke` ⚠️ *first of all*
Nothing in this repo has ever touched the live API. All 462 tests run against a
stubbed `fetch`, so the base URL, envelope handling, pagination arithmetic and
the 429 path are verified against *our reading of the spec* — a reading that has
been wrong before (the missing `/v1`, D19).

**If the client is wrong, all seven commands are wrong in the same way.** Ten
minutes, and it validates every line written so far.

Two things to check in the same session, since the connection is already open:

- **A real `304`.** The ETag path is verified against a *stubbed* 304 only. The
  client provably sends `If-None-Match` and reuses the held body, but openAR has
  never actually returned one to us.
- **B2**, which is one extra request.

### B2 · Do per-deputy vote positions exist? *(fold into the B1 session)*
One array, one request. `actp` is described as *"outras actividades em plenário
(votos, etc.)"* and its element shape is undeclared, so it is the only place an
individual vote position could live — the alternative being that they exist only
inside `detalhe`'s unsanitised HTML (D40). One request against a long-serving
deputy settles it.

Until then both the view and the tool say plainly that plenary votes are
recorded per party, so the absence reads as a property of the data rather than a
missing feature (D91).

### B3 · `metadata/` screenshots
Store review requires them and the directory does not exist. Needs a working
`npm run dev`, and should follow B1 so the screenshots show real data rather
than an error state.

### B4 · `npm run publish`
Last. Everything above is a precondition.

---

## Parked — not committed
Vote notifications, offline caching, per-command preferences. Recorded so they
are not re-litigated as fresh ideas.
