import { Color, List } from "@raycast/api";
import type { Votacao } from "../lib/types";
import { partyVotes, type PartyPosition } from "../lib/party-order";

/**
 * The colour each side is drawn in, matching openAR's own vote bar so the two
 * read the same way, and matching `voteResultIcon`'s green/red for approval and
 * rejection so one vocabulary runs through the whole extension.
 *
 * `absent` is deliberately not a fourth hue: a party that did not vote made no
 * choice, so it is greyed rather than coloured alongside the three that did.
 */
const POSITION_COLOR: Record<PartyPosition, Color> = {
  for: Color.Green,
  against: Color.Red,
  abstained: Color.Yellow,
  absent: Color.SecondaryText,
};

/**
 * How every party voted, as one left-to-right row of tinted tags.
 *
 * This replaces the three markdown lists that used to carry the breakdown. The
 * lists were readable but not *scannable*: a party moved position from vote to
 * vote, so you had to read three headings to answer "where was PS on this".
 * A fixed order with a colour per side turns the same data into a shape, which
 * is the trick openar.pt/votacoes uses and the reason it is quicker to read.
 *
 * Markdown cannot carry a colour, which is why this is `Detail.Metadata` rather
 * than more of `voteDetailMarkdown`.
 */
export function VotePartyMetadata({ vote }: { vote: Votacao }) {
  const parties = partyVotes(vote);

  return (
    <List.Item.Detail.Metadata>
      {parties.length === 0 ? (
        // A vote with no recorded breakdown is possible in the data. Saying so
        // beats rendering an empty row that looks like a loading failure.
        <List.Item.Detail.Metadata.Label title="Party breakdown" text="Not recorded for this vote" />
      ) : (
        // `title` is required by the type but deliberately empty: the tags are
        // self-explanatory once you see them, and a label ate a third of the
        // row's width in a pane this narrow, pushing parties onto a second line.
        <List.Item.Detail.Metadata.TagList title="">
          {parties.map((party) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={party.sigla}
              text={party.sigla}
              color={POSITION_COLOR[party.position]}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
    </List.Item.Detail.Metadata>
  );
}
