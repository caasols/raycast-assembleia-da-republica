import { describe, it, expect } from "vitest";
import { ACTIVITY_CATEGORIES, activityCounts, activityMarkdown } from "./activity";
import type { DeputadoAtividade } from "./types";

const activity = (o: Partial<DeputadoAtividade> = {}): DeputadoAtividade => ({
  deputado: { id: 1, nomeParlamentar: "António Filipe" },
  ...o,
});

describe("ACTIVITY_CATEGORIES", () => {
  it("covers every array the endpoint returns except the deputy itself", () => {
    // 18 keys come back; `deputado` is the subject rather than an activity.
    expect(ACTIVITY_CATEGORIES).toHaveLength(16);
  });

  it("leads with the categories a reader cares about most", () => {
    expect(ACTIVITY_CATEGORIES[0].key).toBe("iniciativas");
    expect(ACTIVITY_CATEGORIES[1].key).toBe("intervencoes");
  });
});

describe("activityCounts", () => {
  it("counts each category", () => {
    const counts = activityCounts(activity({ iniciativas: [{}, {}, {}], intervencoes: [{}] }));
    expect(counts).toEqual([
      { key: "iniciativas", label: "Initiatives authored", count: 3 },
      { key: "intervencoes", label: "Plenary interventions", count: 1 },
    ]);
  });

  it("drops empty categories rather than showing zeroes", () => {
    // A deputy who has never sat on a friendship group should not get a line
    // saying so.
    expect(activityCounts(activity({ iniciativas: [{}], gpa: [] }))).toHaveLength(1);
  });

  it("returns nothing for a deputy with no recorded activity", () => {
    expect(activityCounts(activity())).toEqual([]);
  });

  it("ignores a field that is not an array", () => {
    // The spec declares these as opaque objects, so a shape change must not
    // throw inside a length lookup.
    expect(activityCounts(activity({ iniciativas: undefined }))).toEqual([]);
  });
});

describe("activityMarkdown", () => {
  it("names the legislature when scoped to one", () => {
    const md = activityMarkdown("António Filipe", activity({ iniciativas: [{}] }), "XVII");
    expect(md).toMatch(/^# António Filipe/);
    expect(md).toContain("in the XVII legislature");
  });

  it("says whole career when unscoped", () => {
    expect(activityMarkdown("X", activity({ iniciativas: [{}] }))).toContain("across their whole career");
  });

  it("lists each count", () => {
    const md = activityMarkdown("X", activity({ iniciativas: [{}, {}], comissoes: [{}] }));
    expect(md).toContain("- **2** initiatives authored");
    expect(md).toContain("- **1** committee memberships");
  });

  it("explains that no individual voting record exists, rather than leaving a gap", () => {
    // A reader looking for a voting record needs to know it is missing by
    // nature rather than by oversight.
    expect(activityMarkdown("X", activity({ iniciativas: [{}] }))).toContain(
      "recorded per party rather than per deputy",
    );
  });

  it("says so plainly when there is no activity at all", () => {
    const md = activityMarkdown("X", activity());
    expect(md).toContain("_No activity is recorded for this deputy in this period._");
    expect(md).not.toContain("recorded per party");
  });
});
