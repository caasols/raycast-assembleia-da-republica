/**
 * Presentation helpers for the longest-serving-deputies ranking.
 */
import type { Carreira, Carreiras } from "./types";
import { displayDate } from "./dates";

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

/**
 * What the ranking actually covers, said out loud.
 *
 * `/deputados/carreiras` is hard-capped at 200 rows server-side and ignores
 * `page` entirely (measured 2026-09-01: `limit=500` and `limit=3000` both
 * return 200, and `page=2` returns page 1). It also takes no `q`, so the search
 * bar can only ever filter what was fetched.
 *
 * That makes silence dangerous: a deputy outside the cap produces "no results",
 * which reads as "this person never sat in parliament" rather than "this list
 * does not go that deep". This sentence is what turns the second meaning back
 * on, and it derives the cutoff from the data rather than hardcoding it,
 * because the boundary moves as careers lengthen.
 */
export function rankingCoverage(careers: Carreira[], stats: Carreiras["stats"]): string {
  if (careers.length === 0) {
    return "openAR returned no career data.";
  }

  const cutoff = careers[careers.length - 1].totalLegs;
  const total = stats ? `openAR ranks ${stats.totalDeputies.toLocaleString("en-GB")} deputies in all. ` : "";
  return (
    `Search covers the top ${careers.length} by legislatures served, down to ${cutoff}. ` +
    total +
    "Use Browse Deputies to search every deputy by name."
  );
}
