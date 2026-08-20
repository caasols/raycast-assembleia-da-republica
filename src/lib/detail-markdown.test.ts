import { describe, it, expect } from "vitest";
import { detailStateMarkdown } from "./detail-markdown";

const base = {
  title: "Altera o Código do Trabalho",
  noun: "this initiative",
  render: (data: { body: string }) => `# Rendered\n${data.body}`,
};

describe("detailStateMarkdown", () => {
  it("shows the caller's title while loading, never a blank pane", () => {
    const md = detailStateMarkdown({ ...base, error: undefined, data: undefined });
    expect(md).toContain("# Altera o Código do Trabalho");
    expect(md).toContain("Loading…");
  });

  it("hands a loaded record to the view's own renderer", () => {
    const md = detailStateMarkdown({ ...base, error: undefined, data: { body: "content" } });
    expect(md).toBe("# Rendered\ncontent");
  });

  it("keeps the title in the failure state, so it reads as this thing failing", () => {
    const md = detailStateMarkdown({ ...base, error: new Error("boom"), data: undefined });
    expect(md).toContain("# Altera o Código do Trabalho");
    expect(md).toContain("**Could not load this initiative.**");
    expect(md).toContain("boom");
  });

  it("prefers the error over stale data, since the failed request is the truth now", () => {
    const md = detailStateMarkdown({ ...base, error: new Error("boom"), data: { body: "old" } });
    expect(md).toContain("Could not load");
    expect(md).not.toContain("old");
  });

  it("renders a non-Error rejection as text rather than [object Object]", () => {
    const md = detailStateMarkdown({ ...base, error: "socket hang up", data: undefined });
    expect(md).toContain("socket hang up");
  });
});
