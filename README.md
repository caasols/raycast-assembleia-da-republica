# Assembleia da República for Raycast

![Raycast](https://img.shields.io/badge/Raycast-black?logo=raycast&style=flat)
![React](https://img.shields.io/badge/React-black?logo=react&style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&style=flat)

Search today's parliamentary votes, legislative initiatives, deputies, petitions
and committees from the [Assembleia da República](https://www.parlamento.pt/) —
the Portuguese parliament — directly from your command bar.

Portugal's parliamentary record is public, but reaching it means opening a
browser and navigating a portal. This extension answers the quick-lookup
questions instead: *what was voted today, how did this party vote, who is this
deputy, what happened to that bill.*

It talks to the [openAR](https://openar.pt) API (`https://api.openar.pt/v1`) and
needs **no account, key, or binary installed** — every endpoint is public.

## Features

- See today's plenary votes, each with the full party breakdown — in favour,
  against, abstained, absent
- Filter votes by how a specific party voted, so "everything Chega voted
  against" is one request
- Search legislative initiatives by title and open the full text
- Filter by legislature, back to 1976 — or follow whichever one is sitting
- Browse the 230 sitting deputies, by name or parliamentary group
- Search petitions, with signature counts and debate dates
- Browse parliamentary committees
- See which deputies have served the most legislatures, against the average
- Search in either language: the interface is English, and typing `votações`,
  `deputados` or `petições` still finds the right command

## AI tools

Raycast's AI can query parliament directly, without opening a command:

| Tool | Answers |
| --- | --- |
| `Get Today's Votes` | "What did parliament vote on today?" |
| `Search Initiatives` | "Find bills about labour law in the XVII legislature" |
| `Get Party Votes` | "What has Chega voted against recently?" |
| `Search Deputies` | "Who represents Porto for the PS?" |

## Commands

| Command | Description |
| --- | --- |
| `Browse Today's Votes` | Today's plenary votes and how every party voted |
| `Browse Party Votes` | Votes filtered by how one party voted |
| `Search Initiatives` | Bills, resolutions and proposals, by title |
| `Search Petitions` | Petitions to parliament, by subject |
| `Browse Deputies` | The 230 sitting members, by name or group |
| `Browse Committees` | Parliamentary committees and their acronyms |
| `Browse Longest-Serving Deputies` | Ranked by legislatures served |

## Preferences

| Preference | Default | What it does |
| --- | --- | --- |
| `Default Legislature` | Current | Which legislature lists start on. "Current" follows the sitting legislature automatically, so it stays right after an election. Search Initiatives, Search Petitions and Browse Committees let you change it per search. |
| `Results per Page` | 50 | How many results each request fetches — 25, 50, 100 or 200. Lists load more as you scroll, so a smaller page shows the first results sooner and a larger one scrolls further before fetching again. |

## Notes on the data

- **"Today" means today in Lisbon.** Parliament sits in Lisbon, so the sitting
  day is derived from `Europe/Lisbon` rather than your machine's clock.
- **Parliament does not sit every day.** An empty list on a quiet day says so
  explicitly, and is distinguished from a failed request.
- **Votes are recorded per party, not per deputy.** The Assembleia publishes
  plenary votes as party positions; individual names appear only in roll-call
  records that this extension does not yet surface.
- **A bill's "stage" is not a verdict.** openAR's `estado` is the phase of the
  last recorded event, so it is labelled *Stage* rather than *Result*.
- Data is published by the AR open-data programme and refreshed daily.

## Credits

Parliamentary data comes from **[openAR](https://openar.pt)**, which normalises
the Assembleia da República's open data into a public API. openAR is MIT
licensed. This extension is not affiliated with the Assembleia da República.

## Development

```bash
npm install
npm run dev            # ray develop
npm run lint           # ray lint
npm run typecheck      # both tsconfigs
npm run test           # vitest
npm run test:coverage  # enforces 100% thresholds
npm run smoke          # hits the live API; run manually
npm run build          # ray build
```

`@raycast/api` cannot be imported under vitest — the real package is injected by
the Raycast runtime and has no resolvable Node entry point — so
`vitest.config.ts` aliases it to `test/raycast-api-stub.tsx`, which renders plain
DOM. Tests therefore drive real command code rather than mocks of it.
