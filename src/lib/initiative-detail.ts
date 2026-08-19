/**
 * Markdown for a full initiative — authors, and every stage with its votes.
 */
import type { Autor, Evento, IniciativaDetail } from "./types";
import { displayDate } from "./dates";
import { initiativeLabel } from "./initiatives";
import { resultLabel, voteSummary } from "./votes";

/**
 * How an author is credited.
 *
 * The API models five author kinds, and a deputy author carries a name while a
 * group author carries only a sigla. Falling back through both — rather than
 * assuming either — is what keeps a Government-authored bill from rendering a
 * blank line.
 */
export function authorName(author: Autor): string {
  return author.nome ?? author.grupoParlamentar ?? author.tipo;
}

/** Authors as one line, deduplicated — a bill can list a group twice. */
export function authorsLine(authors: Autor[]): string {
  return [...new Set(authors.map(authorName))].join(", ");
}

function eventSection(event: Evento): string[] {
  const lines: string[] = [];
  const when = event.dataFase ? displayDate(event.dataFase) : null;
  lines.push("", `### ${event.fase}${when ? ` — ${when}` : ""}`);

  if (event.obs) {
    lines.push(event.obs);
  }

  for (const vote of event.votacoes ?? []) {
    const summary = voteSummary(vote);
    // The result is always shown; the breakdown only when parties were
    // recorded, so a vote with no breakdown reads as a result rather than as
    // a result followed by an empty line.
    lines.push(`- **${resultLabel(vote)}**${summary ? ` — ${summary}` : ""}`);
  }

  for (const publication of event.publicacoes ?? []) {
    const pages = publication.paginas.length > 0 ? `, pp. ${publication.paginas.join(", ")}` : "";
    lines.push(`- ${publication.tipo ?? "Published"}${pages}`);
  }

  return lines;
}

export function initiativeFullMarkdown(initiative: IniciativaDetail): string {
  const lines = [`# ${initiative.titulo}`, "", `**${initiativeLabel(initiative)}** · ${initiative.legislaturaId}`];

  if (initiative.epigrafe) {
    lines.push("", `_${initiative.epigrafe}_`);
  }

  const authors = initiative.autores ?? [];
  if (authors.length > 0) {
    lines.push("", `**Authors:** ${authorsLine(authors)}`);
  }

  // "Stage", not "Result": estado is the phase of the last recorded event and
  // explicitly not a verdict on approval.
  if (initiative.estado) {
    lines.push("", `**Stage:** ${initiative.estado}`);
  }
  if (initiative.dataEntrada) {
    lines.push("", `**Entered:** ${displayDate(initiative.dataEntrada)}`);
  }

  const events = initiative.eventos ?? [];
  if (events.length > 0) {
    lines.push("", "## Passage");
    for (const event of events) {
      lines.push(...eventSection(event));
    }
  } else {
    lines.push("", "_No stages have been recorded for this initiative yet._");
  }

  return lines.join("\n");
}
