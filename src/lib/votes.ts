/**
 * Turning a vote into the text and markers the list shows. Pure functions, so
 * the presentation rules are testable without rendering anything.
 */
import type { Votacao, VotacaoListItem } from "./types";
import type { ListVotacoesParams } from "./openar-client";

/** How a party can stand on a vote, as the questions people ask phrase it. */
export type VotePosition = "for" | "against" | "abstained";

/**
 * The `/votacoes` filter for one party's position, written out branch by
 * branch on purpose. A computed key (`{[key]: sigla}`) bypasses TypeScript's
 * excess-property checking, which is exactly how the "in favour" filter once
 * vanished into an ignored `a_favor` while the params type wanted `aFavor` —
 * an unfiltered archive shown as a party's votes (context.md D101). The
 * command and the AI tool both go through here, so they cannot drift apart.
 */
export function positionFilter(
  position: VotePosition,
  sigla: string,
): Pick<ListVotacoesParams, "aFavor" | "contra" | "abstencao"> {
  switch (position) {
    case "against":
      return { contra: sigla };
    case "abstained":
      return { abstencao: sigla };
    default:
      return { aFavor: sigla };
  }
}

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

  // The party breakdown is deliberately NOT here any more. It moved to
  // `VotePartyMetadata`, which draws every party in a fixed left-to-right order
  // tinted by the side it took (D118) — a colour markdown cannot carry, and a
  // shape three prose lists could not make scannable.
  return lines.join("\n");
}
