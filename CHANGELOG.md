# Assembleia da República Changelog

## [Initial Version] - {PR_MERGE_DATE}

Seven commands over the [openAR](https://openar.pt) API:

- `Browse Today's Votes` — today's plenary votes with the full party breakdown,
  anchored to Lisbon's sitting day
- `Browse Party Votes` — votes filtered by how a chosen party voted
- `Search Initiatives` — legislative initiatives by title, with full-text links
- `Search Petitions` — petitions by subject, with signature counts
- `Browse Deputies` — the 230 sitting members, by name or parliamentary group
- `Browse Committees` — parliamentary committees and their acronyms
- `Browse Longest-Serving Deputies` — ranked by legislatures served, against the
  all-time average

Every list opens a detail view — an initiative's stage-by-stage voting record, a
deputy's profile and activity, a committee, a petition — and every command
filters by legislature, back to 1976.

**Nine AI tools**, so Raycast AI can answer parliamentary questions without
opening a command: today's votes, party votes, and search over initiatives,
petitions, deputies and committees, plus detail lookups for an initiative, a
deputy and a deputy's activity. They share the same helpers the commands use, so
a tool and a command cannot disagree about what "approved" means.

Preferences for page size and default legislature.
