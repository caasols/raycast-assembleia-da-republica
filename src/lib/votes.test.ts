import { describe, it, expect } from "vitest";
import {
  initiativeReference,
  positionFilter,
  resultLabel,
  voteDetailMarkdown,
  voteSummary,
  voteTally,
  VOTE_SIDES,
} from "./votes";
import { vote } from "../../test/fixtures";

describe("positionFilter", () => {
  // Asserted with toEqual, not toMatchObject: the bug this guards against
  // (D101) was an extra, ignored key — a subset match would pass right through
  // it. Every position is pinned because the one that broke was the only one
  // no test asserted.
  it("maps 'for' onto the client's aFavor parameter", () => {
    expect(positionFilter("for", "PS")).toEqual({ aFavor: "PS" });
  });

  it("maps 'against' onto contra", () => {
    expect(positionFilter("against", "CH")).toEqual({ contra: "CH" });
  });

  it("maps 'abstained' onto abstencao", () => {
    expect(positionFilter("abstained", "IL")).toEqual({ abstencao: "IL" });
  });
});

describe("VOTE_SIDES", () => {
  it("keeps absences distinct from the three voting positions", () => {
    expect(VOTE_SIDES).toEqual(["aFavor", "contra", "abstencao", "ausencias"]);
  });
});

describe("initiativeReference", () => {
  it("joins the type code and number as parliament writes them", () => {
    expect(initiativeReference(vote())).toBe("P 1/XVII");
  });

  it("drops an empty half rather than leaving a dangling space", () => {
    expect(initiativeReference(vote({ iniciativaTipo: "" }))).toBe("1/XVII");
    expect(initiativeReference(vote({ iniciativaNumero: "" }))).toBe("P");
  });
});

describe("resultLabel", () => {
  it("returns the result on its own for a contested vote", () => {
    expect(resultLabel(vote())).toBe("Aprovado");
  });

  it("marks unanimity, which is a materially different outcome", () => {
    expect(resultLabel(vote({ unanime: true }))).toBe("Aprovado (unanimous)");
  });

  it("carries through every result the API can return", () => {
    expect(resultLabel(vote({ resultado: "Rejeitado" }))).toBe("Rejeitado");
    expect(resultLabel(vote({ resultado: "Prejudicado" }))).toBe("Prejudicado");
  });
});

describe("voteSummary", () => {
  it("lists each side that has parties, in a stable order", () => {
    expect(voteSummary(vote())).toBe("In favour: PS, PSD · Against: CH · Abstained: IL");
  });

  it("omits sides nobody took rather than showing them empty", () => {
    expect(voteSummary(vote({ contra: [], abstencao: [] }))).toBe("In favour: PS, PSD");
  });

  it("includes absences, which are recorded rather than merely missing", () => {
    expect(voteSummary(vote({ ausencias: ["PAN"] }))).toContain("Absent: PAN");
  });

  it("returns an empty string when no breakdown was recorded", () => {
    expect(voteSummary(vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] }))).toBe("");
  });
});

describe("voteDetailMarkdown", () => {
  it("leads with the initiative's title", () => {
    expect(voteDetailMarkdown(vote())).toMatch(/^# Orçamento do Estado para 2027/);
  });

  it("states the result and the initiative reference together", () => {
    expect(voteDetailMarkdown(vote())).toContain("**Aprovado** · P 1/XVII");
  });

  it("leaves the party breakdown to the metadata tags, which can carry a colour", () => {
    // D118 moved it out of markdown. Asserting its ABSENCE here is what stops
    // the breakdown quietly reappearing in both places at once.
    const markdown = voteDetailMarkdown(vote({ ausencias: ["PAN"] }));
    expect(markdown).not.toContain("### In favour");
    expect(markdown).not.toContain("### Against");
    expect(markdown).not.toContain("### Abstained");
    expect(markdown).not.toContain("### Absent");
  });

  it("omits headings for sides nobody took", () => {
    expect(voteDetailMarkdown(vote({ abstencao: [] }))).not.toContain("### Abstained");
  });

  it("includes the vote's description when there is one", () => {
    expect(voteDetailMarkdown(vote({ descricao: "Votação na generalidade" }))).toContain("Votação na generalidade");
  });

  it("still names the vote and its result when no breakdown was recorded", () => {
    // The "not recorded" message now lives in the metadata label; the markdown
    // must not go blank as a result.
    const markdown = voteDetailMarkdown(vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] }));
    expect(markdown).toContain("Orçamento do Estado para 2027");
    expect(markdown).toContain("Aprovado");
  });

  it("keeps the description, which is the one thing markdown still owns here", () => {
    const markdown = voteDetailMarkdown(vote({ descricao: "Requerimento oral, apresentado pelo PSD" }));
    expect(markdown).toContain("Requerimento oral, apresentado pelo PSD");
    expect(markdown).not.toContain("No party breakdown");
  });

  it("renders nothing — not the string 'null' — for a vote with no description", () => {
    expect(voteDetailMarkdown(vote({ descricao: null }))).not.toContain("null");
  });

  it("never renders openAR's raw HTML detail, which is unsanitised third-party markup", () => {
    const markdown = voteDetailMarkdown(vote({ detalhe: "<script>alert(1)</script><b>PS</b>" }));
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("<b>");
  });
});

describe("voteTally", () => {
  it("counts the three sides, in favour first", () => {
    expect(voteTally(vote({ aFavor: ["PS", "PSD"], contra: ["CH"], abstencao: ["IL"] }))?.text).toBe("2\u00B71\u00B71");
  });

  it("spells the sides out in a tooltip, because the numbers alone are cryptic", () => {
    expect(voteTally(vote({ aFavor: ["PS", "PSD"], contra: ["CH"], abstencao: ["IL"] }))?.tooltip).toBe(
      "2 in favour, 1 against, 1 abstained",
    );
  });

  it("distinguishes a landslide from a squeaker, which the row's icon cannot", () => {
    // The whole reason the tally exists: both of these render as a green tick.
    const landslide = voteTally(vote({ aFavor: ["PS", "PSD", "BE", "IL"], contra: [], abstencao: [] }));
    const squeaker = voteTally(vote({ aFavor: ["PS", "PSD"], contra: ["CH", "IL"], abstencao: [] }));
    expect(landslide?.text).toBe("4\u00B70\u00B70");
    expect(squeaker?.text).toBe("2\u00B72\u00B70");
  });

  it("ignores absences, which are not a position on the vote", () => {
    expect(voteTally(vote({ aFavor: ["PS"], contra: [], abstencao: [], ausencias: ["CH", "IL"] }))?.text).toBe(
      "1\u00B70\u00B70",
    );
  });

  it("returns nothing at all when no breakdown was recorded, rather than 0\u00B70\u00B70", () => {
    expect(voteTally(vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] }))).toBeNull();
  });
});

describe("the detail heading", () => {
  it("leaves a short title alone", () => {
    const markdown = voteDetailMarkdown(vote({ iniciativaTitulo: "Lei de Bases da Saúde" }));
    expect(markdown.split("\n")[0]).toBe("# Lei de Bases da Saúde");
    expect(markdown).not.toContain("\u2026");
  });

  it("truncates a legislative title on a word boundary, so it cannot swallow the pane", () => {
    // Real title from openAR: 150 characters, and as an h1 it filled the whole
    // detail pane and pushed the party bar off the bottom.
    const long =
      "Assegura a execução dos Regulamentos (UE) 2024/1349 e 2024/1356, relativos ao procedimento de regresso na fronteira e ao procedimento de triagem";
    const heading = voteDetailMarkdown(vote({ iniciativaTitulo: long })).split("\n")[0];
    expect(heading).toBe("# Assegura a execução dos Regulamentos (UE) 2024/1349 e 2024/1356, relativos ao\u2026");
    expect(heading.length).toBeLessThanOrEqual("# ".length + 81);
    // Cut between words: what survives is a prefix of the original, and the
    // character the cut landed on in the original is a space.
    const body = heading.slice("# ".length, -1);
    expect(long.startsWith(body)).toBe(true);
    expect(long[body.length]).toBe(" ");
  });

  it("cuts mid-word only when the first 80 characters contain no space at all", () => {
    const unbroken = "A".repeat(120);
    const heading = voteDetailMarkdown(vote({ iniciativaTitulo: unbroken })).split("\n")[0];
    expect(heading).toBe(`# ${"A".repeat(80)}\u2026`);
  });
});
