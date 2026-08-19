import { Color, Icon } from "@raycast/api";
import type { Votacao } from "../lib/types";

/**
 * The icon and tint for a vote's outcome.
 *
 * Extracted on its second use, when both the today-votes and party-votes lists
 * needed it. Lives under `components/` rather than `lib/` because it is purely
 * presentational — it maps a result onto Raycast's own `Icon` and `Color`.
 *
 * `Prejudicado` — the vote fell because something else made it moot — is
 * neither a pass nor a defeat, so it gets neither green nor red rather than
 * being lumped in with rejection.
 */
export function voteResultIcon(vote: Votacao): { source: Icon; tintColor: Color } {
  if (vote.resultado === "Aprovado") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (vote.resultado === "Rejeitado") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
}
