import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ listPeticoes: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ listPeticoes: mocks.listPeticoes }));
import tool from "./search-petitions";
import { page, petition } from "../../test/fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listPeticoes.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25 });
});

describe("search-petitions tool", () => {
  it("passes query, legislature and status through", async () => {
    await tool({ query: "tua", legislature: "XVII", status: "Admitida" });
    expect(mocks.listPeticoes).toHaveBeenCalledWith(
      expect.objectContaining({ q: "tua", legislatura: "XVII", situacao: "Admitida", sort: "desc", limit: 25 }),
    );
  });

  it("returns the signature count, the consequential fact about a petition", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition({ urlTexto: null })], 1, 25));
    const result = await tool({});
    expect(result.petitions[0]).toMatchObject({
      id: 1,
      subject: "Pela reabilitação da linha do Tua",
      signatures: 8421,
    });
  });
  it("lets an API failure propagate, so the model cannot mistake silence for data", async () => {
    // D80: a tool that swallowed this would let the model answer confidently
    // about parliament from nothing — the worst outcome this extension has.
    mocks.listPeticoes.mockRejectedValue(new Error("openAR unreachable"));
    await expect(tool({ query: "x" })).rejects.toThrow("openAR unreachable");
  });
});
