import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listDeputados: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listDeputados: mocks.listDeputados }));

import tool from "./search-deputies";
import { deputy, page } from "../../test/fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listDeputados.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
});

describe("search-deputies tool", () => {
  it("defaults to the sitting deputies when no legislature is given", async () => {
    await tool({ name: "Pedro" });
    // Without a legislature the question is almost always about who is in
    // parliament now — the 230 seats this shortcut selects.
    expect(mocks.listDeputados.mock.calls[0][0]).toMatchObject({
      q: "Pedro",
      situacao: "ativo",
      sort: "asc",
      limit: 50,
    });
  });

  it("drops the sitting filter when asked about a past legislature", async () => {
    await tool({ legislature: "X" });
    expect(mocks.listDeputados.mock.calls[0][0]).toMatchObject({ legislatura: "X", situacao: undefined });
  });

  it("passes a party filter through", async () => {
    await tool({ party: "PS" });
    expect(mocks.listDeputados.mock.calls[0][0].grupo).toBe("PS");
  });

  it("returns identity and affiliation for each deputy", async () => {
    mocks.listDeputados.mockResolvedValue(page([deputy()]));
    const result = await tool({});
    expect(result.deputies[0]).toEqual({
      id: 4321,
      name: "Pedro Nuno Santos",
      fullName: "Pedro Nuno de Oliveira Santos",
      party: "PS",
      constituency: "Lisboa",
      legislature: "XVII",
    });
  });
});
