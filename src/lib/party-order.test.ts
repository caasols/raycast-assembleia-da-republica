import { describe, it, expect } from "vitest";
import { PARTY_ORDER, partyVotes } from "./party-order";
import { vote as fixtureVote } from "../../test/fixtures";

const vote = fixtureVote;

describe("partyVotes", () => {
  it("orders parties left to right rather than by which side they took", () => {
    const result = partyVotes(vote({ aFavor: ["PSD", "IL"], contra: ["BE", "PS"], abstencao: ["PAN"], ausencias: [] }));
    expect(result.map((p) => p.sigla)).toEqual(["BE", "PAN", "PS", "IL", "PSD"]);
  });

  it("tags each party with the side it took", () => {
    const result = partyVotes(vote({ aFavor: ["PSD"], contra: ["PS"], abstencao: ["PAN"], ausencias: ["CH"] }));
    expect(result).toEqual([
      { sigla: "PAN", position: "abstained" },
      { sigla: "PS", position: "against" },
      { sigla: "PSD", position: "for" },
      { sigla: "CH", position: "absent" },
    ]);
  });

  it("reproduces the order openAR's own vote bar uses", () => {
    // The row is only readable as a shape if it matches the source people
    // already know, so this pins the exact sequence from openar.pt/votacoes.
    const result = partyVotes(
      vote({
        aFavor: ["IL", "PSD", "CDS-PP", "CH"],
        contra: ["BE", "PCP", "L", "PS", "JPP"],
        abstencao: ["PAN"],
        ausencias: [],
      }),
    );
    expect(result.map((p) => p.sigla)).toEqual(["BE", "PCP", "L", "PAN", "PS", "JPP", "IL", "PSD", "CDS-PP", "CH"]);
  });

  it("still renders a party it has no ideological placement for, after the placed ones", () => {
    // A II Legislatura vote must not silently drop UEDS just because this
    // extension declines to guess where it sat.
    const result = partyVotes(vote({ aFavor: ["UEDS", "PS"], contra: [], abstencao: [], ausencias: [] }));
    expect(result.map((p) => p.sigla)).toEqual(["PS", "UEDS"]);
  });

  it("sorts several unplaced groups alphabetically, not by API order", () => {
    const result = partyVotes(vote({ aFavor: ["UEDS", "ASDI", "PRD"], contra: [], abstencao: [], ausencias: [] }));
    expect(result.map((p) => p.sigla)).toEqual(["ASDI", "PRD", "UEDS"]);
  });

  it("orders a mix of placed and unplaced groups whichever way round the data lists them", () => {
    // Both directions of the comparison matter: the API can return an unplaced
    // group before or after a placed one, and the row must read the same.
    expect(
      partyVotes(vote({ aFavor: ["UEDS", "PS"], contra: ["ASDI", "BE"], abstencao: [], ausencias: [] })).map(
        (p) => p.sigla,
      ),
    ).toEqual(["BE", "PS", "ASDI", "UEDS"]);
    expect(
      partyVotes(vote({ aFavor: ["PS", "UEDS"], contra: ["BE", "ASDI"], abstencao: [], ausencias: [] })).map(
        (p) => p.sigla,
      ),
    ).toEqual(["BE", "PS", "ASDI", "UEDS"]);
  });

  it("lists a party once even if the data names it on two sides", () => {
    const result = partyVotes(vote({ aFavor: ["PS"], contra: ["PS"], abstencao: [], ausencias: [] }));
    expect(result).toEqual([{ sigla: "PS", position: "for" }]);
  });

  it("returns nothing when no breakdown was recorded", () => {
    expect(partyVotes(vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] }))).toEqual([]);
  });

  it("places the historical names beside the parties they became", () => {
    // PPD is PSD's original name and CDS is CDS-PP's, so a 1980s vote reads
    // in the same left-to-right shape as a current one.
    const result = partyVotes(vote({ aFavor: ["CDS", "PPD"], contra: ["PCP", "UDP"], abstencao: [], ausencias: [] }));
    expect(result.map((p) => p.sigla)).toEqual(["UDP", "PCP", "PPD", "CDS"]);
  });

  it("keeps CH at the right-hand end, where openAR puts it", () => {
    expect(PARTY_ORDER[PARTY_ORDER.length - 1]).toBe("CH");
  });
});
