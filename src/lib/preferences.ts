import { getPreferenceValues } from "@raycast/api";
import { clampLimit } from "./query";

/**
 * Used when the preference is unreadable. Matches openAR's own default `limit`,
 * so an extension that cannot read its preferences still behaves like the API's
 * documented baseline rather than some number of our own invention.
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * How many results each request fetches.
 *
 * `Preferences` is the type Raycast generates from package.json into
 * raycast-env.d.ts, so it stays in step with the manifest automatically. It is
 * deliberately not redeclared here: a hand-written copy widens
 * `"25" | "50" | "100" | "200"` back to `string` and drifts silently the moment
 * the manifest changes.
 *
 * A dropdown yields strings, so the value is parsed. It is then clamped through
 * the same `clampLimit` every request uses, which means a preferences file
 * edited by hand — Raycast stores them outside the extension — cannot push a
 * value past the API's 1..200 range and turn every list into a 400.
 */
export function getPageSize(): number {
  const { pageSize } = getPreferenceValues<Preferences>();
  const parsed = Number.parseInt(pageSize, 10);
  return Number.isNaN(parsed) ? DEFAULT_PAGE_SIZE : clampLimit(parsed);
}

/**
 * Which legislature lists start on.
 *
 * `"current"` is resolved from the data at runtime rather than stored as an id,
 * so it keeps following the sitting legislature after an election instead of
 * pinning to whichever one was current when the preference was set.
 */
export type LegislatureScope = "current" | "all";

export function getDefaultLegislatureScope(): LegislatureScope {
  const { defaultLegislature } = getPreferenceValues<Preferences>();
  // Anything unrecognised falls back to "current": the narrower, faster default,
  // and the one that matches what most lookups are actually about.
  return defaultLegislature === "all" ? "all" : "current";
}
