/**
 * Where each party stood on a vote, in a stable left-to-right order.
 */
import type { Votacao } from "./types";
import { VOTE_SIDES } from "./votes";

export type PartyPosition = "for" | "against" | "abstained" | "absent";

export interface PartyVote {
  sigla: string;
  position: PartyPosition;
}

const SIDE_POSITION: Record<(typeof VOTE_SIDES)[number], PartyPosition> = {
  aFavor: "for",
  contra: "against",
  abstencao: "abstained",
  ausencias: "absent",
};

/**
 * Parliamentary groups left to right, which is the order openAR itself renders
 * its vote bar in, and roughly the order the chamber is seated in.
 *
 * The point of a *fixed* order is that a party keeps its position from vote to
 * vote, so the row becomes a shape you can read at a glance — green on the
 * right is a right-wing majority — rather than a list you have to parse.
 *
 * **Scope, deliberately narrow.** These are the groups openAR displays for the
 * sitting legislatures, plus the historical names of parties already here:
 * `PEV` sat with `PCP` as CDU, `PPD` is `PSD`'s original name, `CDS` is
 * `CDS-PP` before the rename, and `PPM` sat to the right of `CDS`. `UDP` is the
 * one older group placed on conviction rather than continuity.
 *
 * Everything else `/meta` lists — `ASDI`, `ID`, `MDP/CDE`, `PRD`, `PSN`,
 * `UEDS`, `Ninsc`, `Indep` and the institutional authors — is deliberately
 * **not** placed. Assigning a 1976 party a left-to-right position is a
 * political judgement this extension has no business making up, so unlisted
 * groups sort after the known ones, alphabetically, and still render. A vote
 * from the II Legislatura therefore shows every group, just without a claimed
 * ideological ordering.
 */
export const PARTY_ORDER: readonly string[] = [
  "UDP",
  "BE",
  "PCP",
  "PEV",
  "L",
  "PAN",
  "PS",
  "JPP",
  "IL",
  "PPD",
  "PSD",
  "CDS",
  "CDS-PP",
  "PPM",
  "CH",
];

const RANK = new Map(PARTY_ORDER.map((sigla, index) => [sigla, index]));

/**
 * Every party that took a position on this vote, ordered by `PARTY_ORDER`.
 *
 * A party is listed once: the sides are read in `VOTE_SIDES` order, so if the
 * data ever contradicts itself by naming a group twice, the first side wins
 * rather than the party appearing twice in the row.
 */
export function partyVotes(vote: Votacao): PartyVote[] {
  const seen = new Set<string>();
  const votes: PartyVote[] = [];

  for (const side of VOTE_SIDES) {
    for (const sigla of vote[side]) {
      if (seen.has(sigla)) {
        continue;
      }
      seen.add(sigla);
      votes.push({ sigla, position: SIDE_POSITION[side] });
    }
  }

  return votes.sort((a, b) => {
    const rankA = RANK.get(a.sigla);
    const rankB = RANK.get(b.sigla);
    // Unplaced groups keep a stable, explainable order of their own rather than
    // whatever order the API happened to return them in.
    if (rankA === undefined && rankB === undefined) {
      return a.sigla.localeCompare(b.sigla);
    }
    if (rankA === undefined) {
      return 1;
    }
    if (rankB === undefined) {
      return -1;
    }
    return rankA - rankB;
  });
}
