import { getIniciativa } from "../lib/openar-client";
import { authorsLine } from "../lib/initiative-detail";
import { initiativeLabel } from "../lib/initiatives";
import { resultLabel, voteSummary } from "../lib/votes";

type Input = {
  /** Numeric initiative id, as returned by the initiative search. */
  id: number;
};

/** AI tool: the full record of one initiative, including how it was voted. */
export default async function tool(input: Input) {
  const initiative = await getIniciativa(input.id);
  return {
    id: initiative.id,
    title: initiative.titulo,
    reference: initiativeLabel(initiative),
    legislature: initiative.legislaturaId,
    // "stage", never "result": estado is the phase of the last recorded event,
    // not a verdict on approval.
    stage: initiative.estado,
    entered: initiative.dataEntrada,
    authors: authorsLine(initiative.autores ?? []),
    fullTextUrl: initiative.linkTexto,
    // The actual verdicts live here, in the votes attached to each stage —
    // which is what a question about whether something passed really wants.
    stages: (initiative.eventos ?? []).map((event) => ({
      phase: event.fase,
      date: event.dataFase,
      votes: (event.votacoes ?? []).map((vote) => ({
        result: resultLabel(vote),
        breakdown: voteSummary(vote),
        inFavour: vote.aFavor,
        against: vote.contra,
        abstained: vote.abstencao,
      })),
    })),
  };
}
