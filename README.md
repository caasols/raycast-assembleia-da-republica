# Assembleia da República

![Raycast](https://img.shields.io/badge/Raycast-black?logo=raycast&style=flat)
![React](https://img.shields.io/badge/React-black?logo=react&style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&style=flat)

Browse today's parliamentary votes, search legislative initiatives, deputies,
petitions and committees from the
[Assembleia da República](https://www.parlamento.pt/) — the Portuguese
parliament — directly from your command bar.

<!-- Hero screenshot lands here once metadata/ exists (PLAN.md B3). -->

Portugal's parliamentary record is public, but reaching it means opening a
browser and navigating a portal. This extension answers the quick-lookup
questions instead: _what was voted today, how did this party vote, who is this
deputy, what happened to that bill._ It talks to the
[openAR](https://openar.pt) API (`https://api.openar.pt/v1`), which normalises
the parliament's open data into a public API, so it needs **no account, key,
or other binary installed** — every endpoint is public.

## Features

- See today's plenary votes, each with the full party breakdown — in favour,
  against, abstained, absent
- Filter votes by how a specific party voted, so "everything Chega voted
  against" is one request
- Search legislative initiatives by title and open the full text
- Filter by legislature, back to 1976 — or follow whichever one is sitting
- Browse the 230 sitting deputies, by name or parliamentary group
- Search petitions, with signature counts and debate dates
- Browse parliamentary committees and drill into their initiatives
- See which deputies have served the most legislatures, against the average
- Ask Raycast AI directly — nine tools answer questions like "how did PS vote
  on the budget?" without opening a command
- Search in either language: the interface is English, and typing `votações`,
  `deputados` or `petições` still finds the right command

## Commands

| Command                           | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `Browse Today's Votes`            | Today's plenary votes and how every party voted |
| `Browse Party Votes`              | Votes filtered by how one party voted           |
| `Search Initiatives`              | Bills, resolutions and proposals, by title      |
| `Search Petitions`                | Petitions to parliament, by subject             |
| `Browse Deputies`                 | The 230 sitting members, by name or group       |
| `Browse Committees`               | Parliamentary committees and their acronyms     |
| `Browse Longest-Serving Deputies` | Ranked by legislatures served                   |

Every list row pushes into a detail view — an initiative's full passage with
its per-stage votes, a deputy's mandates and biography, a petition's committee
trail — so no command is a dead end.

<!-- Per-command screenshots land here once metadata/ exists (PLAN.md B3). -->

## AI tools

Raycast's AI can query parliament directly, without opening a command:

| Tool                 | Answers                                                |
| -------------------- | ------------------------------------------------------ |
| `Get Today's Votes`  | "What did parliament vote on today?"                   |
| `Search Initiatives` | "Find bills about labour law in the XVII legislature"  |
| `Get Party Votes`    | "What has Chega voted against recently?"               |
| `Search Deputies`    | "Who represents Porto for the PS?"                     |
| `Search Petitions`   | "Are there petitions about the Tua railway line?"      |
| `Search Committees`  | "Which committee handles constitutional affairs?"      |
| `Get Initiative`     | "Did that housing bill actually pass, and who voted how?" |
| `Get Deputy`         | "What has this deputy authored, and what got approved?" |
| `Get Deputy Activity` | "How much committee work does this deputy actually do?" |

The tools share their logic with the commands, so a tool and a view cannot
disagree about what a vote means.

## Preferences

| Preference            | Default | What it does                                                                                                                                                                                            |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Default Legislature` | Current | Which legislature lists start on. "Current" follows the sitting legislature automatically, so it stays right after an election. Search Initiatives, Search Petitions and Browse Committees let you change it per search. |
| `Results per Page`    | 50      | How many results each request fetches — 25, 50, 100 or 200. Lists load more as you scroll, so a smaller page shows the first results sooner and a larger one scrolls further before fetching again.        |

## Notes on the data

- **"Today" means today in Lisbon.** Parliament sits in Lisbon, so the sitting
  day is derived from `Europe/Lisbon` rather than your machine's clock.
- **Parliament does not sit every day.** An empty list on a quiet day says so
  explicitly, and is distinguished from a failed request.
- **Votes are recorded per party, not per deputy.** The Assembleia publishes
  plenary votes as party positions; individual names appear only in roll-call
  records that this extension does not yet surface.
- **A bill's "stage" is not a verdict.** openAR's `estado` is the phase of the
  last recorded event, so it is labelled _Stage_ rather than _Result_.
- Data is published by the AR open-data programme and refreshed daily. openAR
  allows 100 requests a minute; when that limit bites, the extension says so
  and tells you how long to wait.

## Getting Started

### Raycast Store

The extension is headed for the Raycast Store; the listing link will appear
here once it is published.

### Manual

```bash
git clone https://github.com/caasols/raycast-assembleia-da-republica.git
cd raycast-assembleia-da-republica
npm install && npm run dev
```

### Development

Other useful scripts:

```bash
npm test               # unit and component tests
npm run test:coverage  # the same, enforcing 100% thresholds
npm run test:mutation  # Stryker, installed on demand; grades the tests themselves
npm run typecheck      # extension and test projects
npm run lint
npm run build
```

`@raycast/api` cannot be imported under vitest — the real package is injected
by the Raycast runtime and has no resolvable Node entry point — so
`vitest.config.ts` aliases it to `test/raycast-api-stub.tsx`, which renders
plain DOM. Tests therefore drive real command code rather than mocks of it.

There is also a smoke test that runs against the live API. It is read-only and
needs no credentials: it drives the real client through every endpoint the
extension uses, logging each response status — including whether the two ETag
endpoints really answer `304` on revalidation — so it catches the vendored
OpenAPI contract drifting from what the server actually returns. Steps collect
failures rather than stopping at the first one:

```bash
npm run smoke
```

## Contributing

Issues and pull requests are welcome. Please open a discussion if you plan to
work on a larger change so we can align on the approach.

## Support

If this extension saves you time:

- Star the [GitHub repository](https://github.com/caasols/raycast-assembleia-da-republica)
- Share it with anyone who follows Portuguese politics from their command bar
- Report bugs or enhancements via GitHub issues

## Credits

Parliamentary data comes from **[openAR](https://openar.pt)**, which normalises
the Assembleia da República's open data into a public API. openAR is MIT
licensed. This extension is not affiliated with the Assembleia da República.

## License

Released under the [MIT License](./LICENSE).
