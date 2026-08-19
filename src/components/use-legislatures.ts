import { useCachedPromise } from "@raycast/utils";
import { currentLegislature, listLegislaturas } from "../lib/openar-client";
import { getDefaultLegislatureScope } from "../lib/preferences";

/** The dropdown value meaning "do not filter by legislature". */
export const ALL_LEGISLATURES = "";

/**
 * The legislature list, and which one a command should start on.
 *
 * `initialId` resolves the `defaultLegislature` preference against live data
 * rather than storing an id: `"current"` follows whichever legislature is
 * sitting, so it stays correct after an election instead of pinning to the one
 * that happened to be current when the preference was set.
 *
 * While loading it returns `ALL_LEGISLATURES`, which is the honest answer —
 * "we do not yet know which is current" — and means the first request is
 * unfiltered rather than filtered by a guess.
 */
export function useLegislatures(): { legislatures: { id: string; nome: string }[]; initialId: string } {
  const { data } = useCachedPromise(async () => listLegislaturas(), []);
  const legislatures = data ?? [];

  if (getDefaultLegislatureScope() === "all") {
    return { legislatures, initialId: ALL_LEGISLATURES };
  }
  return { legislatures, initialId: currentLegislature(legislatures)?.id ?? ALL_LEGISLATURES };
}
