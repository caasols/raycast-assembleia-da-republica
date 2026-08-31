/**
 * Presentation helpers for the longest-serving-deputies ranking.
 */
import type { Carreira } from "./types";
import { displayDate } from "./dates";

/** Party and span, the two facts that give a career its shape. */
export function careerSubtitle(career: Carreira): string {
  const span = careerSpan(career);
  return [career.lastParty, span].filter(Boolean).join(" · ");
}

/**
 * The years a deputy's service spans, from first to most recent legislature.
 *
 * Years only: the API gives the *start dates of legislatures*, not of mandates,
 * so anything more precise would imply accuracy the data does not have.
 */
export function careerSpan(career: Carreira): string | null {
  const first = career.firstLegStart?.slice(0, 4);
  const last = career.lastLegStart?.slice(0, 4);
  if (!first) {
    return null;
  }
  return first === last || !last ? first : `${first}–${last}`;
}

export function careerDetailMarkdown(career: Carreira): string {
  const lines = [`# ${career.nomeParlamentar}`, "", `**${career.totalLegs} legislatures**`];

  const facts: string[] = [];
  if (career.lastParty) {
    facts.push(`**Most recent group:** ${career.lastParty}`);
  }
  if (career.firstLegStart) {
    facts.push(`**First served:** ${displayDate(career.firstLegStart)}`);
  }
  if (career.lastLegStart) {
    facts.push(`**Most recently:** ${displayDate(career.lastLegStart)}`);
  }
  if (facts.length > 0) {
    lines.push("", ...facts.map((fact) => `- ${fact}`));
  }

  if (career.legIds.length > 0) {
    lines.push("", "### Legislatures", career.legIds.join(", "));
  }

  return lines.join("\n");
}
