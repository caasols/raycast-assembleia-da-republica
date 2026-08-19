/**
 * Markdown for a deputy's full record — mandates, biography, authorship.
 */
import type { BioEntrada, DeputadoDetail, Mandato } from "./types";
import { displayDate } from "./dates";

/** A mandate as one line: legislature, group, constituency. */
export function mandateLine(mandate: Mandato): string {
  const parts = [mandate.legislaturaId, mandate.grupoParlamentar, mandate.circuloEleitoral].filter(Boolean);
  return mandate.situacao ? `${parts.join(" · ")} (${mandate.situacao})` : parts.join(" · ");
}

function bioSection(title: string, entries: BioEntrada[] | undefined): string[] {
  const described = (entries ?? []).map((entry) => entry.descricao).filter((d): d is string => Boolean(d));
  if (described.length === 0) {
    return [];
  }
  return ["", `### ${title}`, ...described.map((d) => `- ${d}`)];
}

export function deputyFullMarkdown(deputy: DeputadoDetail): string {
  const lines = [`# ${deputy.nomeParlamentar}`];

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
  if (deputy.profissao) {
    facts.push(`**Profession:** ${deputy.profissao}`);
  }
  if (deputy.dataNascimento) {
    facts.push(`**Born:** ${displayDate(deputy.dataNascimento)}`);
  }
  if (facts.length > 0) {
    lines.push("", ...facts.map((f) => `- ${f}`));
  }

  if (deputy.stats) {
    // Authored vs approved is the one number that says something about a
    // deputy's record rather than their CV, so it leads the sections.
    lines.push(
      "",
      "## Legislative record",
      `- **${deputy.stats.total}** initiatives authored`,
      `- **${deputy.stats.aprovadas}** approved`,
    );
  }

  if (deputy.mandatos.length > 0) {
    lines.push("", "## Mandates", ...deputy.mandatos.map((m) => `- ${mandateLine(m)}`));
  }

  const bio = deputy.bio;
  if (bio) {
    lines.push(
      ...bioSection("Education", bio.habilitacoes),
      ...bioSection("Titles", bio.titulos),
      ...bioSection("Roles held", bio.cargosFuncoes),
      ...bioSection("Honours", bio.condecoracoes),
      ...bioSection("Published works", bio.obrasPublicadas),
    );
  }

  if (deputy.iniciativas.length > 0) {
    lines.push(
      "",
      "## Recent initiatives",
      ...deputy.iniciativas.map((i) => `- ${i.titulo}${i.dataEntrada ? ` (${displayDate(i.dataEntrada)})` : ""}`),
    );
  }

  return lines.join("\n");
}
