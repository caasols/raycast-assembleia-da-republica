/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { VotePartyMetadata } from "./vote-party-tags";
import { vote as fixtureVote } from "../../test/fixtures";

const vote = fixtureVote;
afterEach(cleanup);

const tags = () => screen.getAllByTestId("tag").map((t) => [t.getAttribute("data-text"), t.getAttribute("data-color")]);

describe("VotePartyMetadata", () => {
  it("draws every party in the fixed left-to-right order", () => {
    render(
      <VotePartyMetadata
        vote={vote({ aFavor: ["PSD", "IL"], contra: ["BE", "PS"], abstencao: ["PAN"], ausencias: [] })}
      />,
    );
    expect(tags().map(([text]) => text)).toEqual(["BE", "PAN", "PS", "IL", "PSD"]);
  });

  it("tints each side the way openAR does, and the way voteResultIcon already does", () => {
    render(
      <VotePartyMetadata vote={vote({ aFavor: ["PSD"], contra: ["PS"], abstencao: ["PAN"], ausencias: ["CH"] })} />,
    );
    // The colour IS the feature here: a tag with the wrong tint says the
    // opposite of the truth, and no markdown assertion could catch it.
    expect(tags()).toEqual([
      ["PAN", "Yellow"],
      ["PS", "Red"],
      ["PSD", "Green"],
      ["CH", "SecondaryText"],
    ]);
  });

  it("carries no title, so the pills get the full width of the pane", () => {
    // A label consumed a third of the row and pushed parties onto a second
    // line, which breaks the left-to-right shape the order exists to create.
    render(<VotePartyMetadata vote={vote()} />);
    expect(screen.getByTestId("tag-list")).toHaveAttribute("data-title", "");
  });

  it("says a breakdown is missing rather than rendering an empty row", () => {
    render(<VotePartyMetadata vote={vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] })} />);
    expect(screen.queryByTestId("tag-list")).not.toBeInTheDocument();
    const label = screen.getByTestId("metadata-label");
    expect(label).toHaveAttribute("data-title", "Party breakdown");
    expect(label).toHaveAttribute("data-text", "Not recorded for this vote");
  });
});
