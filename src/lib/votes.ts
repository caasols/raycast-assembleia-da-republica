/**
 * Turning a vote into the text and markers the list shows. Pure functions, so
 * the presentation rules are testable without rendering anything.
 */
import type { Votacao, VotacaoListItem } from "./types";

/**
 * How a party voted. `ausencias` is kept distinct from "did not appear at all":
 * an absence is recorded, and collapsing it into silence would misreport it.
 */
export const VOTE_SIDES = ["aFavor", "contra", "abstencao", "ausencias"] as const;

const SIDE_LABELS: Record<(typeof VOTE_SIDES)[number], string> = {
  aFavor: "In favour",
  contra: "Against",
  abstencao: "Abstained",
  ausencias: "Absent",
};

/**
 * The initiative's reference as parliament writes it, e.g. `Projeto de Lei
 * 1/XVII`. `tipo` is the single-letter code; the list rows show it beside the
 * number so two initiatives with the same number stay distinguishable.
 */
export function initiativeReference(vote: VotacaoListItem): string {
  return [vote.iniciativaTipo, vote.iniciativaNumero].filter(Boolean).join(" ");
}

/**
 * A one-line summary of who voted which way, for a list accessory or a copy
 * action. Sides with no parties are dropped rather than shown empty.
 */
export function voteSummary(vote: Votacao): string {
  return VOTE_SIDES.filter((side) => vote[side].length > 0)
    .map((side) => `${SIDE_LABELS[side]}: ${vote[side].join(", ")}`)
    .join(" · ");
}

/**
 * The vote's outcome as a short label, marking unanimity where it applies.
 * Unanimity is worth surfacing: it is the difference between a contested result
 * and one nobody opposed, and the API models it as its own flag.
 */
export function resultLabel(vote: Votacao): string {
  return vote.unanime ? `${vote.resultado} (unanimous)` : vote.resultado;
}

/**
 * The detail pane's markdown: what was voted, how it went, and who stood where.
 *
 * `detalhe` — openAR's raw AR HTML — is deliberately not rendered. For
 * roll-call votes it names individual deputies, but it is unsanitised markup
 * from a third party, and Raycast's markdown renderer is not the place to find
 * out what it contains.
 */
export function voteDetailMarkdown(vote: VotacaoListItem): string {
  const lines = [`# ${vote.iniciativaTitulo}`, "", `**${resultLabel(vote)}** · ${initiativeReference(vote)}`];

  if (vote.descricao) {
    lines.push("", vote.descricao);
  }

  for (const side of VOTE_SIDES) {
    if (vote[side].length > 0) {
      lines.push("", `### ${SIDE_LABELS[side]}`, vote[side].join(", "));
    }
  }

  // A vote where every side is empty is possible in the data; saying so beats
  // rendering a heading with nothing under it.
  if (VOTE_SIDES.every((side) => vote[side].length === 0)) {
    lines.push("", "_No party breakdown was recorded for this vote._");
  }

  return lines.join("\n");
}
