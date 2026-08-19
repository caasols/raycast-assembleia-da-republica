import { useCachedPromise } from "@raycast/utils";
import { getMeta, parliamentaryGroups } from "../lib/openar-client";

/**
 * Which endpoint the party list is destined for.
 *
 * This is the whole reason the hook exists. `/meta` returns one `grupos` array,
 * but it is **not** valid everywhere: it is prefixed with the institutional
 * authors `Governo`, `PAR`, `Madeira`, `Açores` and `Mesa`, which
 * `/iniciativas?grupo=` and `/votacoes?grupo=` accept and `/deputados?grupo=`
 * rejects with a 400.
 *
 * Naming the destination makes that a choice a caller has to make, rather than
 * a trap they fall into by reaching for `meta.grupos` directly.
 */
export type PartyScope =
  /** `/iniciativas` and `/votacoes` — institutional authors included. */
  | "authors"
  /** `/deputados` — parliamentary groups only. */
  | "members";

/**
 * The party siglas for a filter dropdown.
 *
 * Cached: `/meta` carries the longest `max-age` openAR sets (an hour) and the
 * party list does not change between keystrokes.
 *
 * Returns an empty array while loading or on failure rather than throwing. A
 * dropdown that is briefly empty degrades to "no filter available"; one that
 * throws takes the whole command down over a filter, which is the wrong
 * trade when the list itself still renders.
 */
export function useParties(scope: PartyScope): string[] {
  const { data } = useCachedPromise(async () => getMeta(), []);
  const grupos = data?.grupos ?? [];
  return scope === "members" ? parliamentaryGroups(grupos) : grupos;
}
