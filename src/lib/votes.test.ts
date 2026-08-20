import { describe, it, expect } from "vitest";
import { initiativeReference, positionFilter, resultLabel, voteDetailMarkdown, voteSummary, VOTE_SIDES } from "./votes";
import type { VotacaoListItem } from "./types";

function vote(overrides: Partial<VotacaoListItem> = {}): VotacaoListItem {
  return {
    id: "v1",
    data: "2026-08-18",
    resultado: "Aprovado",
    unanime: false,
    reuniao: null,
    tipoReuniao: "RP",
    descricao: null,
    aFavor: ["PS", "PSD"],
    contra: ["CH"],
    abstencao: ["IL"],
    ausencias: [],
    detalhe: null,
    iniciativaId: 42,
    iniciativaTitulo: "Orçamento do Estado para 2027",
    iniciativaNumero: "1/XVII",
    iniciativaTipo: "P",
    legislaturaId: "XVII",
    ...overrides,
  };
}

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

  it("gives each side that voted its own heading", () => {
    const markdown = voteDetailMarkdown(vote({ ausencias: ["PAN"] }));
    expect(markdown).toContain("### In favour\nPS, PSD");
    expect(markdown).toContain("### Against\nCH");
    expect(markdown).toContain("### Abstained\nIL");
    expect(markdown).toContain("### Absent\nPAN");
  });

  it("omits headings for sides nobody took", () => {
    expect(voteDetailMarkdown(vote({ abstencao: [] }))).not.toContain("### Abstained");
  });

  it("includes the vote's description when there is one", () => {
    expect(voteDetailMarkdown(vote({ descricao: "Votação na generalidade" }))).toContain("Votação na generalidade");
  });

  it("says so explicitly when no breakdown was recorded", () => {
    const markdown = voteDetailMarkdown(vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] }));
    expect(markdown).toContain("_No party breakdown was recorded for this vote._");
  });

  it("does not claim a missing breakdown when only some sides are empty", () => {
    const markdown = voteDetailMarkdown(vote({ contra: [], abstencao: [], ausencias: [] }));
    expect(markdown).toContain("### In favour");
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
