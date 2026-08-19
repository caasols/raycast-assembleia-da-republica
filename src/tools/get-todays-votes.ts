import { listVotacoes } from "../lib/openar-client";
import { todayInLisbon } from "../lib/dates";
import { initiativeReference, resultLabel, voteSummary } from "../lib/votes";

/**
 * AI tool: what parliament voted on today.
 *
 * Tools return plain data for the model to phrase, not markdown for a human to
 * read — the phrasing is the model's job and pre-formatting it only constrains
 * the answer.
 */
export default async function tool(): Promise<{
  date: string;
  count: number;
  votes: { initiative: string; reference: string; result: string; breakdown: string }[];
}> {
  const date = todayInLisbon();
  // Parliament sits in Lisbon, so "today" is today there rather than on the
  // machine asking.
  const page = await listVotacoes({ dataInicio: date, dataFim: date, limit: 200 });
  return {
    date,
    count: page.total,
    votes: page.data.map((vote) => ({
      initiative: vote.iniciativaTitulo,
      reference: initiativeReference(vote),
      result: resultLabel(vote),
      breakdown: voteSummary(vote),
    })),
  };
}
