import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { currentLegislature, listLegislaturas } from "../lib/openar-client";
import { getDefaultLegislatureScope } from "../lib/preferences";

/** The dropdown value meaning "do not filter by legislature". */
export const ALL_LEGISLATURES = "";

/**
 * The legislature list, which one a command should start on, and — for
 * commands with a legislature dropdown — the current selection.
 *
 * `initialId` resolves the `defaultLegislature` preference against live data
 * rather than storing an id: `"current"` follows whichever legislature is
 * sitting, so it stays correct after an election instead of pinning to the one
 * that happened to be current when the preference was set.
 *
 * While loading it returns `ALL_LEGISLATURES`, which is the honest answer —
 * "we do not yet know which is current" — and means the first request is
 * unfiltered rather than filtered by a guess.
 *
 * `selectedId` follows `initialId` until the user chooses, then the choice
 * wins for good — including over a `/legislaturas` response that lands *after*
 * the choice. Three commands used to re-implement that rule with the same
 * four lines each; it lives here so it cannot drift per command.
 */
export function useLegislatures(): {
  legislatures: { id: string; nome: string }[];
  initialId: string;
  selectedId: string;
  setSelectedId: (id: string) => void;
} {
  const { data } = useCachedPromise(async () => listLegislaturas(), []);
  const legislatures = data ?? [];
  // undefined means "the user has not chosen", which must stay distinct from
  // choosing ALL_LEGISLATURES — "" is a real choice that must not be
  // overridden when the preference's "current" resolves a moment later.
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);

  const initialId =
    getDefaultLegislatureScope() === "all"
      ? ALL_LEGISLATURES
      : (currentLegislature(legislatures)?.id ?? ALL_LEGISLATURES);

  return { legislatures, initialId, selectedId: chosenId ?? initialId, setSelectedId: setChosenId };
}
