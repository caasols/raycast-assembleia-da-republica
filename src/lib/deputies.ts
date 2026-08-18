/**
 * Presentation helpers for deputies.
 */
import type { Deputado } from "./types";

/** Group and constituency — how a deputy is normally identified in context. */
export function deputySubtitle(deputy: Deputado): string {
  return [deputy.grupoParlamentar, deputy.circuloEleitoral].filter(Boolean).join(" · ");
}

export function deputyDetailMarkdown(deputy: Deputado): string {
  const lines = [`# ${deputy.nomeParlamentar}`];

  // Only worth repeating when it differs; for most deputies the parliamentary
  // name is simply a shortening of the full one.
  if (deputy.nomeCompleto && deputy.nomeCompleto !== deputy.nomeParlamentar) {
    lines.push("", `_${deputy.nomeCompleto}_`);
  }

  const facts: string[] = [];
  if (deputy.grupoParlamentar) {
    facts.push(`**Group:** ${deputy.grupoParlamentar}`);
  }
  if (deputy.circuloEleitoral) {
    facts.push(`**Constituency:** ${deputy.circuloEleitoral}`);
  }
  if (deputy.situacao) {
    facts.push(`**Status:** ${deputy.situacao}`);
  }
  facts.push(`**Legislature:** ${deputy.legislaturaId}`);
  lines.push("", ...facts.map((fact) => `- ${fact}`));

  return lines.join("\n");
}
