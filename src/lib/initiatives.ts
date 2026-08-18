/**
 * Presentation helpers for legislative initiatives.
 */
import type { Iniciativa } from "./types";
import { displayDate } from "./dates";

/**
 * The initiative's reference as parliament writes it, e.g. `Projeto de Lei
 * 1/XVII`. Uses `tipoDesc` rather than the single-letter `tipo`, since this is
 * read by people rather than sent to the API.
 */
export function initiativeLabel(initiative: Iniciativa): string {
  return [initiative.tipoDesc, initiative.numero].filter(Boolean).join(" ");
}

/**
 * Markdown for the detail pane.
 *
 * `estado` is labelled "Stage" rather than "Result" deliberately. The spec is
 * explicit that it is the phase of the last recorded event and not a verdict —
 * `Aprovado` is not even one of its values. Calling it a result in the UI would
 * invite exactly the misreading the API documentation warns about.
 */
export function initiativeDetailMarkdown(initiative: Iniciativa): string {
  const lines = [`# ${initiative.titulo}`, "", `**${initiativeLabel(initiative)}** · ${initiative.legislaturaId}`];

  if (initiative.epigrafe) {
    lines.push("", `_${initiative.epigrafe}_`);
  }

  const facts: string[] = [];
  if (initiative.estado) {
    facts.push(`**Stage:** ${initiative.estado}`);
  }
  if (initiative.dataEntrada) {
    facts.push(`**Entered:** ${displayDate(initiative.dataEntrada)}`);
  }
  if (initiative.dataFim) {
    facts.push(`**Concluded:** ${displayDate(initiative.dataFim)}`);
  }
  if (facts.length > 0) {
    lines.push("", ...facts.map((fact) => `- ${fact}`));
  }

  if (!initiative.linkTexto) {
    // Said plainly, because the absence of the "Open Full Text" action would
    // otherwise look like a missing feature rather than missing data.
    lines.push("", "_No full text is published for this initiative._");
  }

  return lines.join("\n");
}
