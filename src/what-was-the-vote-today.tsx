import { List } from "@raycast/api";

/**
 * Today's plenary votes.
 *
 * Scaffold only — P0 exists to make the extension load, build and test; the
 * real fetch lands in P3 against `GET /votacoes` (see OPENAR-API.md §8), which
 * returns each vote already carrying its initiative's title, so the list needs
 * a single request rather than a fan-out.
 *
 * `mode` is `view` (context.md O2): a `no-view` command can only raise a HUD or
 * toast, which cannot show a list of votes.
 */
export default function Command() {
  return (
    <List>
      <List.EmptyView title="No votes yet" description="Fetching today's votes is not implemented yet." />
    </List>
  );
}
