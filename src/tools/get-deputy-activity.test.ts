import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getDeputadoAtividade: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getDeputadoAtividade: mocks.getDeputadoAtividade }));
import tool from "./get-deputy-activity";

beforeEach(() => vi.clearAllMocks());

describe("get-deputy-activity tool", () => {
  it("scopes to a legislature when given one", async () => {
    mocks.getDeputadoAtividade.mockResolvedValue({});
    await tool({ id: 7, legislature: "XVII" });
    expect(mocks.getDeputadoAtividade).toHaveBeenCalledWith(7, "XVII");
  });

  it("reports the whole career when unscoped", async () => {
    mocks.getDeputadoAtividade.mockResolvedValue({});
    expect(await tool({ id: 7 })).toMatchObject({ legislature: "all" });
  });

  it("counts the activity by category", async () => {
    mocks.getDeputadoAtividade.mockResolvedValue({
      deputado: { id: 7, nomeParlamentar: "António Filipe" },
      iniciativas: [{}, {}],
      intervencoes: [{}],
    });
    const result = await tool({ id: 7 });
    expect(result.deputy).toBe("António Filipe");
    expect(result.activity).toEqual([
      { key: "iniciativas", label: "Initiatives authored", count: 2 },
      { key: "intervencoes", label: "Plenary interventions", count: 1 },
    ]);
  });

  it("states in the payload that no per-deputy voting record exists", async () => {
    // Without this the model could infer from an absent field that a deputy
    // never votes, when the data simply is not published per person.
    mocks.getDeputadoAtividade.mockResolvedValue({});
    expect((await tool({ id: 7 })).note).toContain("recorded per party, not per deputy");
  });

  it("returns a null deputy name when the payload omits it", async () => {
    mocks.getDeputadoAtividade.mockResolvedValue({ iniciativas: [{}] });
    expect((await tool({ id: 7 })).deputy).toBeNull();
  });
});
