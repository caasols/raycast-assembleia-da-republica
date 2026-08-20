# PLAN — what we do next

The forward plan, and **only** the forward plan: an item is deleted from this
file the moment it lands. What already exists is inventoried in `context.md` §1;
decisions and blockers live there too, and the working rules in `CLAUDE.md`.

- **Next:** C6 — extract the detail-view scaffold
  (`context.md` §6.2)
- **Outstanding risk:** nothing here has ever run against the live API (`context.md` §3 B1)
- **Last updated:** 2026-08-20

---

## Track C — audit remediation (2026-08-20, no author needed)

Findings and evidence live in `context.md` §6; this is the work, in priority
order. C-numbers are fresh — the retired A-numbers stay reserved because old
decisions still cite them.

### C2v · P1 — Verify the mutant kill with a re-run
The C2 assertions landed; a verification mutation run is in flight. Read its
report, confirm the actionable survivors died, record the new score in
`context.md` §6.2, and delete this item.

### C6 · P2 — Extract the detail-view scaffold (4 copies)
Initiative/deputy/petition/activity detail components repeat the
`error → "Could not load…" / no data → "Loading…" / data → render` markdown and
the conditional Retry action. One component (`RemoteDetail`?) taking `title`,
the fetch state, and a render function.

### C7 · P3 — Trim the stub's buzz-inherited dead surface
~250 lines with zero users here (`context.md` §6.3): the Form layer,
LocalStorage, Keyboard, toasts/alerts, `useNavigation`, `Action.SubmitForm`,
`Action.Open`, `LaunchType`. Keep only what this extension's tests drive; CLAUDE.md
already says the stub grows *when a command needs it*, and re-adding from buzz's
copy is one paste away. Whatever stays: fix `extensionName: "buzz"` and the
comment citing buzz's `set-status.test.tsx`.

### C8 · P3 — Small dead-code and dedup sweep
- Delete `VotacaoKey` (`types.ts`) — zero importers.
- Decide `dadosLegis`: add it to `ACTIVITY_CATEGORIES` or comment why it is
  excluded; fix the activity test's "18 keys" comment that asserts 16.
- One `unexpectedShape()` helper for the nine identical `OpenArError` throws.
- `signatureLabel` builds `"8,421 signatures"` and the markdown strips the
  suffix back off — split into count formatter + label instead.
- Pin D80 (failures propagate) with one test in each of the eight tools that
  lack it, matching `get-todays-votes`.

### C9 · P3 — Fold the legislature-selection dance into the hook
Three commands repeat `useState<string | undefined>` + `?? initialId` + the
same comment. `useLegislatures` can return `selectedId`/`setSelectedId` and own
the "preference until the user chooses" rule in one tested place.

### C10 · P4 — Decide: adopt mutation testing permanently?
The audit ran Stryker as a one-off and reverted it. **For:** it found the only
class of defect the 100%-coverage ratchet cannot see, in a suite that already
had 462 green tests. **Against:** ~175 devDependencies and a wall-clock cost
far beyond the unit suite, so it does not belong in the per-push CI job.
Recommendation: add as an `npm run test:mutation` script plus a manual/weekly
`workflow_dispatch` job, not a per-push gate.

### C11 · P4 — Toolchain nits
`@types/node` 22.x vs CI's Node 24; `depcheck`'s `@vitest/coverage-v8` flag is
a false positive (loaded by `vitest --coverage`) — note it wherever a future
dependency sweep would trip over it.

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
