import { describe, it, expect } from "vitest";
import { careerDetailMarkdown, careerSpan, careerSubtitle } from "./careers";
import type { Carreiras } from "./types";
import { career as fixtureCareer } from "../../test/fixtures";

const career = fixtureCareer;

const STATS: Carreiras["stats"] = { totalDeputies: 3012, singleTerm: 1204, avgLegs: 1.83 };

describe("careerSpan", () => {
  it("renders first and last years as a range", () => {
    expect(careerSpan(career())).toBe("1991–2024");
  });

  it("collapses a single-legislature career to one year", () => {
    expect(careerSpan(career({ firstLegStart: "2024-03-26", lastLegStart: "2024-03-26" }))).toBe("2024");
  });

  it("falls back to the first year when the last is missing", () => {
    expect(careerSpan(career({ lastLegStart: null }))).toBe("1991");
  });

  it("returns null when there is no start date at all", () => {
    expect(careerSpan(career({ firstLegStart: null }))).toBeNull();
  });
});

describe("careerSubtitle", () => {
  it("pairs the party with the span", () => {
    expect(careerSubtitle(career())).toBe("PCP · 1991–2024");
  });

  it("drops whichever half is missing", () => {
    expect(careerSubtitle(career({ lastParty: null }))).toBe("1991–2024");
    expect(careerSubtitle(career({ firstLegStart: null, lastLegStart: null }))).toBe("PCP");
  });
});

describe("careerDetailMarkdown", () => {
  it("leads with the name and the headline count", () => {
    const markdown = careerDetailMarkdown(career(), STATS);
    expect(markdown).toMatch(/^# António Filipe/);
    expect(markdown).toContain("**11 legislatures**");
  });

  it("lists party and both dates", () => {
    const markdown = careerDetailMarkdown(career(), STATS);
    expect(markdown).toContain("**Most recent group:** PCP");
    expect(markdown).toContain("**First served:** 31 October 1991");
    expect(markdown).toContain("**Most recently:** 26 March 2024");
  });

  it("lists the legislatures served", () => {
    expect(careerDetailMarkdown(career(), STATS)).toContain("### Legislatures\nVI, VII, VIII");
  });

  it("omits the legislature list when there is none", () => {
    expect(careerDetailMarkdown(career({ legIds: [] }), STATS)).not.toContain("### Legislatures");
  });

  it("compares against every deputy, not just the returned page", () => {
    const markdown = careerDetailMarkdown(career(), STATS);
    expect(markdown).toContain("Across all 3,012 deputies");
    expect(markdown).toContain("average is 1.8 legislatures");
    expect(markdown).toContain("1,204 served only one");
  });

  it("omits the comparison when the API sent no stats", () => {
    expect(careerDetailMarkdown(career(), null)).not.toContain("### For comparison");
  });

  it("omits facts the record does not carry", () => {
    const markdown = careerDetailMarkdown(career({ lastParty: null, firstLegStart: null, lastLegStart: null }), null);
    expect(markdown).not.toContain("**Most recent group:**");
    expect(markdown).not.toContain("**First served:**");
  });
});
