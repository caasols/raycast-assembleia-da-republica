import { listVotacoes } from "../lib/openar-client";
import { todayInLisbon } from "../lib/dates";
import { initiativeReference, resultLabel, voteSummary } from "../lib/votes";

/**
 * AI tool: the votes of parliament's most recent sitting day.
 *
 * It used to ask for today only, which was empty on about 311 days a year
 * (parliament sits on roughly 54), so the usual answer was a truthful but
 * useless "no votes today". Browse Votes had the same problem and fixed it by
 * opening on the newest votes (D116); this is the same fix for the tool.
 *
 * Both dates are returned: `date` is the sitting day, `today` is Lisbon's date
 * (parliament sits there). The model can then say "nothing today; on 28
 * October parliament voted on..." without being told how to phrase it.
 *
 * Tools return plain data for the model to phrase, not markdown for a human to
 * read — the phrasing is the model's job and pre-formatting it only constrains
 * the answer.
 */
export default async function tool(): Promise<{
  today: string;
  date: string;
  count: number;
  votes: { initiative: string; reference: string; result: string; breakdown: string }[];
}> {
  const today = todayInLisbon();
  // The newest vote names the most recent sitting day. One row is enough.
  const newest = await listVotacoes({ sort: "desc", limit: 1 });
  const date = newest.data[0]?.data;
  if (!date) {
    // Answering "no votes" here would be a confident wrong answer (D80).
    throw new Error("openAR returned no dated vote, so the most recent sitting day cannot be determined");
  }
  // The busiest sitting day of XVII had 98 votes, so 200 covers a day. If one
  // ever exceeds it, `count` still carries the true total, so a partial list
  // shows as partial rather than complete.
  const day = await listVotacoes({ dataInicio: date, dataFim: date, limit: 200 });
  return {
    today,
    date,
    count: day.total,
    votes: day.data.map((vote) => ({
      initiative: vote.iniciativaTitulo,
      reference: initiativeReference(vote),
      result: resultLabel(vote),
      breakdown: voteSummary(vote),
    })),
  };
}
