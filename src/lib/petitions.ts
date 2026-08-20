/**
 * Presentation helpers for petitions.
 */
import type { Peticao } from "./types";
import { displayDate } from "./dates";

/**
 * Signature count, formatted for reading — "8,421", no unit.
 *
 * Petitions cross thresholds at 1 000 (a written response), 4 000 (a committee
 * hearing) and 7 500 (a plenary debate), so the number is the most
 * consequential fact about a petition and is shown rather than buried.
 */
export function signatureCount(petition: Peticao): string | null {
  if (petition.assinaturas === null) {
    return null;
  }
  return petition.assinaturas.toLocaleString("en-GB");
}

/** The count with its unit, for a list accessory that stands alone. */
export function signatureLabel(petition: Peticao): string | null {
  const count = signatureCount(petition);
  return count === null ? null : `${count} signatures`;
}

export function petitionDetailMarkdown(petition: Peticao): string {
  const lines = [`# ${petition.assunto ?? "Untitled petition"}`];

  const reference = [petition.numero, petition.legislaturaId].filter(Boolean).join(" · ");
  if (reference) {
    lines.push("", `**${reference}**`);
  }

  const facts: string[] = [];
  if (petition.autor) {
    facts.push(`**Author:** ${petition.autor}`);
  }
  // The "Signatures:" label already names the unit, so only the count follows.
  const signatures = signatureCount(petition);
  if (signatures) {
    facts.push(`**Signatures:** ${signatures}`);
  }
  if (petition.situacao) {
    facts.push(`**Status:** ${petition.situacao}`);
  }
  if (petition.dataEntrada) {
    facts.push(`**Submitted:** ${displayDate(petition.dataEntrada)}`);
  }
  if (petition.dataDebate) {
    // Only a small minority of petitions reach a plenary debate, so this is
    // worth stating rather than leaving as an empty field.
    facts.push(`**Debated:** ${displayDate(petition.dataDebate)}`);
  }
  if (facts.length > 0) {
    lines.push("", ...facts.map((fact) => `- ${fact}`));
  }

  if (!petition.urlTexto) {
    lines.push("", "_No text is published for this petition._");
  }

  return lines.join("\n");
}
