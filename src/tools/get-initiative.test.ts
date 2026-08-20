import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getIniciativa: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getIniciativa: mocks.getIniciativa }));
import tool from "./get-initiative";
import { initiative } from "../../test/fixtures";

beforeEach(() => vi.clearAllMocks());

const BASE = initiative();

describe("get-initiative tool", () => {
  it("fetches the initiative by id", async () => {
    mocks.getIniciativa.mockResolvedValue(BASE);
    await tool({ id: 42 });
    expect(mocks.getIniciativa).toHaveBeenCalledWith(42);
  });

  it("calls estado a stage, and puts the real verdicts in the stage votes", async () => {
    mocks.getIniciativa.mockResolvedValue({
      ...BASE,
      autores: [{ tipo: "grupo", deputadoId: null, grupoParlamentar: "PS", nome: null }],
      eventos: [
        {
          id: 1,
          fase: "Votação na generalidade",
          dataFase: "2026-04-10",
          obs: null,
          votacoes: [
            {
              id: "v1",
              data: "2026-04-10",
              resultado: "Aprovado",
              unanime: false,
              reuniao: null,
              tipoReuniao: null,
              descricao: null,
              aFavor: ["PS"],
              contra: ["CH"],
              abstencao: [],
              ausencias: [],
              detalhe: null,
            },
          ],
        },
      ],
    });
    const result = await tool({ id: 42 });
    expect(result).toMatchObject({ stage: "Lei (Publicação DR)", authors: "PS" });
    expect(result).not.toHaveProperty("result");
    // The actual verdict a "did it pass?" question wants lives here.
    expect(result.stages[0].votes[0]).toMatchObject({ result: "Aprovado", inFavour: ["PS"], against: ["CH"] });
  });

  it("handles an initiative with no stages or authors", async () => {
    mocks.getIniciativa.mockResolvedValue(BASE);
    const result = await tool({ id: 42 });
    expect(result.stages).toEqual([]);
    expect(result.authors).toBe("");
  });

  it("handles a stage that carries no votes", async () => {
    mocks.getIniciativa.mockResolvedValue({
      ...BASE,
      eventos: [{ id: 1, fase: "Entrada", dataFase: null, obs: null }],
    });
    expect((await tool({ id: 42 })).stages[0].votes).toEqual([]);
  });
  it("lets an API failure propagate, so the model cannot mistake silence for data", async () => {
    // D80: a tool that swallowed this would let the model answer confidently
    // about parliament from nothing — the worst outcome this extension has.
    mocks.getIniciativa.mockRejectedValue(new Error("openAR unreachable"));
    await expect(tool({ id: 42 })).rejects.toThrow("openAR unreachable");
  });
});
