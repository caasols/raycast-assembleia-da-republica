/**
 * Summarising a deputy's parliamentary activity.
 *
 * The API returns 18 parallel arrays whose *element* shapes the spec does not
 * declare. Counting them is therefore the one thing that can be done honestly
 * without live data — and a count per category is genuinely the answer to
 * "what does this deputy actually do", which a list of opaque objects is not.
 */
import type { DeputadoAtividade } from "./types";

/** The categories worth surfacing, in the order a reader cares about them. */
export const ACTIVITY_CATEGORIES = [
  { key: "iniciativas", label: "Initiatives authored" },
  { key: "intervencoes", label: "Plenary interventions" },
  { key: "requerimentos", label: "Formal requests" },
  { key: "comissoes", label: "Committee memberships" },
  { key: "atividadesComissao", label: "Committee activities" },
  { key: "relIni", label: "Initiatives reported on" },
  { key: "relPet", label: "Petitions reported on" },
  { key: "relPareceres", label: "Opinions issued" },
  { key: "relContas", label: "Public accounts reports" },
  { key: "relIniEur", label: "European initiatives reported on" },
  { key: "scgt", label: "Subcommittees and working groups" },
  { key: "gpa", label: "Friendship groups" },
  { key: "dlp", label: "Permanent delegations" },
  { key: "dle", label: "Occasional delegations" },
  { key: "parlJovens", label: "Youth Parliament" },
  { key: "actp", label: "Other plenary activity" },
] as const satisfies readonly { key: keyof DeputadoAtividade; label: string }[];

export interface ActivityCount {
  key: string;
  label: string;
  count: number;
}

/**
 * How much of each kind of activity there is, dropping the empty categories.
 *
 * Empty ones are dropped rather than shown as zero: a deputy who has never sat
 * on a friendship group should not have a line saying so.
 */
export function activityCounts(activity: DeputadoAtividade): ActivityCount[] {
  return ACTIVITY_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    count: Array.isArray(activity[key]) ? (activity[key] as unknown[]).length : 0,
  })).filter((entry) => entry.count > 0);
}

export function activityMarkdown(name: string, activity: DeputadoAtividade, legislature?: string): string {
  const counts = activityCounts(activity);
  const scope = legislature ? `in the ${legislature} legislature` : "across their whole career";
  const lines = [`# ${name}`, "", `Parliamentary activity ${scope}.`];

  if (counts.length === 0) {
    lines.push("", "_No activity is recorded for this deputy in this period._");
    return lines.join("\n");
  }

  lines.push("", ...counts.map((entry) => `- **${entry.count}** ${entry.label.toLowerCase()}`));

  // Said explicitly rather than left as an absence: a reader looking for a
  // voting record needs to know it is missing by nature, not by oversight.
  lines.push(
    "",
    "---",
    "",
    "_Plenary votes are recorded per party rather than per deputy, so an individual voting record is not shown here._",
  );
  return lines.join("\n");
}
