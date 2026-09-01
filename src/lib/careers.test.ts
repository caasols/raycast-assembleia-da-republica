import { describe, it, expect } from "vitest";
import { careerDetailMarkdown, rankingCoverage } from "./careers";
import { career as fixtureCareer } from "../../test/fixtures";

const career = fixtureCareer;

describe("careerDetailMarkdown", () => {
  it("leads with the name and the headline count", () => {
    const markdown = careerDetailMarkdown(career());
    expect(markdown).toMatch(/^# António Filipe/);
    expect(markdown).toContain("**11 legislatures**");
  });

  it("lists party and both dates", () => {
    const markdown = careerDetailMarkdown(career());
    expect(markdown).toContain("**Most recent group:** PCP");
    expect(markdown).toContain("**First served:** 31 October 1991");
    expect(markdown).toContain("**Most recently:** 26 March 2024");
  });

  it("lists the legislatures served", () => {
    expect(careerDetailMarkdown(career())).toContain("### Legislatures\nVI, VII, VIII");
  });

  it("omits the legislature list when there is none", () => {
    expect(careerDetailMarkdown(career({ legIds: [] }))).not.toContain("### Legislatures");
  });

  it("carries no population comparison: it was removed as noise (D113)", () => {
    expect(careerDetailMarkdown(career())).not.toContain("For comparison");
  });

  it("omits facts the record does not carry", () => {
    const markdown = careerDetailMarkdown(career({ lastParty: null, firstLegStart: null, lastLegStart: null }));
    expect(markdown).not.toContain("**Most recent group:**");
    expect(markdown).not.toContain("**First served:**");
  });
});

describe("rankingCoverage", () => {
  it("names the depth reached, derived from the data rather than hardcoded", () => {
    const careers = [career({ totalLegs: 12 }), career({ id: 2, totalLegs: 4 })];
    const text = rankingCoverage(careers, { totalDeputies: 2586, singleTerm: 1466, avgLegs: 1.9 });
    expect(text).toContain("top 2 by legislatures served, down to 4");
  });

  it("gives the size of the population the ranking is a slice of", () => {
    const text = rankingCoverage([career()], { totalDeputies: 2586, singleTerm: 1466, avgLegs: 1.9 });
    expect(text).toContain("openAR ranks 2,586 deputies in all");
  });

  it("points at the command that can actually search every deputy", () => {
    // /deputados takes a real `q`; this endpoint does not. Saying so is the
    // difference between a dead end and a redirect.
    expect(rankingCoverage([career()], null)).toContain("Use Browse Deputies to search every deputy by name.");
  });

  it("omits the population sentence when openAR sent no stats", () => {
    expect(rankingCoverage([career()], null)).not.toContain("in all");
  });

  it("says plainly that nothing came back, rather than quoting a coverage of zero", () => {
    expect(rankingCoverage([], null)).toBe("openAR returned no career data.");
  });
});
