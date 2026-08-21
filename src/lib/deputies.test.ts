import { describe, it, expect } from "vitest";
import { deputyDetailMarkdown, deputySubtitle } from "./deputies";
import { deputy } from "../../test/fixtures";

describe("deputySubtitle", () => {
  it("pairs group and constituency", () => {
    expect(deputySubtitle(deputy())).toBe("PS · Lisboa");
  });

  it("drops whichever half is missing", () => {
    expect(deputySubtitle(deputy({ circuloEleitoral: null }))).toBe("PS");
    expect(deputySubtitle(deputy({ grupoParlamentar: null }))).toBe("Lisboa");
    expect(deputySubtitle(deputy({ grupoParlamentar: null, circuloEleitoral: null }))).toBe("");
  });
});

describe("deputyDetailMarkdown", () => {
  it("leads with the parliamentary name", () => {
    expect(deputyDetailMarkdown(deputy())).toMatch(/^# Pedro Nuno Santos/);
  });

  it("shows the full name when it differs", () => {
    expect(deputyDetailMarkdown(deputy())).toContain("_Pedro Nuno de Oliveira Santos_");
  });

  it("does not repeat the name when both forms are identical", () => {
    const markdown = deputyDetailMarkdown(deputy({ nomeCompleto: "Pedro Nuno Santos" }));
    expect(markdown).not.toContain("_Pedro Nuno Santos_");
  });

  it("lists group, constituency, status and legislature", () => {
    const markdown = deputyDetailMarkdown(deputy());
    expect(markdown).toContain("**Group:** PS");
    expect(markdown).toContain("**Constituency:** Lisboa");
    expect(markdown).toContain("**Status:** Efetivo");
    expect(markdown).toContain("**Legislature:** XVII");
  });

  it("always states the legislature, even when everything else is missing", () => {
    const markdown = deputyDetailMarkdown(
      deputy({ grupoParlamentar: null, circuloEleitoral: null, situacao: null, nomeCompleto: "" }),
    );
    expect(markdown).toContain("**Legislature:** XVII");
    expect(markdown).not.toContain("**Group:**");
  });
});
