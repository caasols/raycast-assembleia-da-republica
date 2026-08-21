import { listVotacoes } from "../lib/openar-client";
import { initiativeReference, positionFilter, resultLabel } from "../lib/votes";
import type { VotePosition } from "../lib/votes";

type Input = {
  /** Party sigla, e.g. "PS", "PSD", "CH", "IL". */
  party: string;
  /** How the party voted. Defaults to votes in favour. */
  position?: VotePosition;
  /** Legislature identifier, e.g. "XVII". Omit for every legislature. */
  legislature?: string;
};

/** AI tool: how a party voted. */
export default async function tool(input: Input) {
  // The API filters by position itself, so this is one request rather than
  // fetching everything and filtering here — which the rate limit would punish.
  // The position→parameter mapping is shared with Browse Party Votes (D103),
  // so the tool and the command cannot answer the same question differently.
  const page = await listVotacoes({
    ...positionFilter(input.position ?? "for", input.party),
    legislatura: input.legislature,
    sort: "desc",
    limit: 25,
  });

  return {
    party: input.party,
    position: input.position ?? "for",
    total: page.total,
    votes: page.data.map((vote) => ({
      initiative: vote.iniciativaTitulo,
      reference: initiativeReference(vote),
      date: vote.data,
      result: resultLabel(vote),
      inFavour: vote.aFavor,
      against: vote.contra,
      abstained: vote.abstencao,
    })),
  };
}
