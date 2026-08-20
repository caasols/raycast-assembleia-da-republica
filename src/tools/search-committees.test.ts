import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listComissoes: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listComissoes: mocks.listComissoes }));
import tool from "./search-committees";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listComissoes.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
});

describe("search-committees tool", () => {
  it("passes the query and legislature through", async () => {
    await tool({ query: "saúde", legislature: "XVII" });
    expect(mocks.listComissoes).toHaveBeenCalledWith(
      expect.objectContaining({ q: "saúde", legislatura: "XVII", sort: "asc", limit: 50 }),
    );
  });

  it("returns the id, so a follow-up need not resolve the name again", async () => {
    mocks.listComissoes.mockResolvedValue({
      data: [{ id: 42, sigla: "CACDLG", nome: "Assuntos Constitucionais" }],
      total: 1,
      page: 1,
      limit: 50,
    });
    const result = await tool({});
    expect(result.committees[0]).toEqual({ id: 42, name: "Assuntos Constitucionais", acronym: "CACDLG" });
  });
});
