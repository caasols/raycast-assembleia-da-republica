# PLAN — what we do next

The forward plan, and **only** the forward plan: an item is deleted from this
file the moment it lands. What already exists is inventoried in `context.md` §1;
decisions and blockers live there too, and the working rules in `CLAUDE.md`.

- **Next:** B1 — the audit's Track C is fully landed (context.md §6, D100–D106);
  everything that could be done without the author is done again
- **Outstanding risk:** nothing here has ever run against the live API (`context.md` §3 K1)
- **Last updated:** 2026-08-20

---

## Track B — needs a networked or installable machine

Ordered by dependency, not by size. B1 first because everything else is worth
less until it passes.

### B1 · Run `npm run smoke` ⚠️ *first of all*
Nothing in this repo has ever touched the live API. All 525 tests run against a
stubbed `fetch`, so the base URL, envelope handling, pagination arithmetic and
the 429 path are verified against *our reading of the spec* — a reading that has
been wrong before (the missing `/v1`, D19).

**If the client is wrong, all seven commands are wrong in the same way.** Ten
minutes, and it validates every line written so far.

The script covers all 13 endpoints and prints every response status (D108), so
one run also answers the two questions that used to be separate checklist
items: the second fetch of an initiative and of a petition should log a literal
`304` (the ETag path has only ever seen a stubbed one), and the `actp:` line is
B2's evidence. Read the whole output, not just the exit code.

While the connection is open, also check two things for O11 (future agendas):
does the live `/meta → estados` vocabulary include an "Agendamento"-type
stage, and does a current initiative's `comissoesFases` carry a populated
`dataAgendamentoPlenario`? Those two answers decide B5.

### B2 · Do per-deputy vote positions exist? *(read it off the B1 output)*
`actp` is described as *"outras actividades em plenário (votos, etc.)"* and its
element shape is undeclared, so it is the only place an individual vote
position could live — the alternative being that they exist only inside
`detalhe`'s unsanitised HTML (D40). The B1 smoke run prints the longest-serving
deputy's `actp` length and first element; interpreting that line settles this
(O10). The script deliberately does not interpret it.

Until then both the view and the tool say plainly that plenary votes are
recorded per party, so the absence reads as a property of the data rather than a
missing feature (D91).

### B3 · `metadata/` screenshots
Store review requires them and the directory does not exist. Needs a working
`npm run dev`, and should follow B1 so the screenshots show real data rather
than an error state.

### B4 · `npm run publish`
Last. Everything above is a precondition.

### B5 · Browse Upcoming Debates — *conditional on B1's O11 answer*
openAR has no agenda endpoint (`context.md` O11), so this exists only if the
live `estados` vocabulary turns out to include an "Agendamento"-type stage:
then `/iniciativas?estado=<that value>` is a one-request "scheduled for
debate" list and this becomes an ordinary command reusing `loadListPage`. If
the vocabulary has no such value, delete this item — future agendas would
need a second data source (parlamento.pt), which D10 argues against.

---

## Parked — not committed
Vote notifications, offline caching, per-command preferences. Recorded so they
are not re-litigated as fresh ideas.
