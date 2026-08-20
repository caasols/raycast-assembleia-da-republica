# PLAN — what we do next

The forward plan, and **only** the forward plan: an item is deleted from this
file the moment it lands. What already exists is inventoried in `context.md` §1;
decisions and blockers live there too, and the working rules in `CLAUDE.md`.

- **Next:** C1 — a P0 bug the 2026-08-20 audit found (`context.md` §6, D101);
  it needs no network and outranks everything below it
- **Outstanding risk:** nothing here has ever run against the live API (`context.md` §3 B1)
- **Last updated:** 2026-08-20

---

## Track C — audit remediation (2026-08-20, no author needed)

Findings and evidence live in `context.md` §6; this is the work, in priority
order. C-numbers are fresh — the retired A-numbers stay reserved because old
decisions still cite them.

### C1 · P0 — Fix the "Voted in favour" filter in Browse Party Votes
`{[how]: sigla}` with `how = "a_favor"` misses the client's camelCase `aFavor`,
so the command's **default position queries nothing** and shows the unfiltered
archive as the party's in-favour votes (D101). The fix is two parts, and the
second is the one that keeps this from recurring:

- Map dropdown ids to client keys explicitly (`a_favor → aFavor`) — or rename
  the client params to the wire names so no translation exists to get wrong.
  Decide once; the tool `get-party-votes` must keep passing whichever survives.
- **Regression tests that assert the client call for all three positions**,
  including the default. The existing tests check `contra` and `abstencao`
  only, which is exactly why this shipped.

Done when: all three positions produce the right parameter, a test fails if
any of them regresses, and the tool and command agree.

### C2 · P1 — Kill the surviving mutants
Mutation testing scored the suite **81.2%** (1 118 of 1 377 killed) and
`context.md` §6.2 sorts the 258 survivors into bins. The work, in its order:

- The **"real gaps"** list: pin `sort` in the five tools, `isShowingDetail` in
  five commands, the whitespace-only search rule, client pathnames, the
  `Retry-After` whitespace case, the `ALL_LEGISLATURES` coupling, Retry-absent
  in the two detail views, `get-deputy`'s uncovered mapping, and `asPaginated`
  fixtures whose fallbacks differ from their real values.
- The **stub gap**: serialise `data-keywords` in the stub (the D57 pattern),
  then assert keywords in the commands — ~15 survivors die at once.
- Note the equivalent mutants in a comment or here; do not chase the ~90
  cosmetic string survivors.

Done when every survivor is either killed or explained — 100% *explained*, not
100% score.

### C3 · P1 — README's AI-tools table lists 4 of 9 tools
Stale since D88. Add the five missing rows (petitions, committees, initiative,
deputy, deputy activity) in the same "Answers" voice.

### C4 · P2 — Extract the paginated-fetch closure (6 copies)
Five commands and `CommitteeDetail` repeat the same plumbing: `toApiPage` →
`""→undefined` filters → `{data, hasMore}`. One helper in `lib/` (the pure
mapping) or one hook in `components/` (the `useCachedPromise` wiring) removes
the copy that matters. Not look-alike UI — mechanical translation, so the D54
"only look alike" caution does not apply. While there, settle the `pageSize`
inconsistency: six closures close over it while `longest-serving-deputies.tsx`
passes it as an argument with a comment explaining why the other way is wrong.

### C5 · P2 — Shared test fixtures (`test/fixtures.ts`)
The `VotacaoListItem` literal is pasted in ≥4 test files, `Iniciativa` in ≥3,
a `page()` helper in ~5 — most of jscpd's 85 clones. One fixtures module with
`vote()`, `initiative()`, `petition()`, `deputy()`, `page()` builders. Update
`CLAUDE.md`'s layout table when it lands.

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
