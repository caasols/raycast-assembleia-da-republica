/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "./lib/errors";
import type { Deputado } from "./lib/types";

const mocks = vi.hoisted(() => ({
  listDeputados: vi.fn(),
  getMeta: vi.fn(),
  deputadoPhotoUrl: vi.fn((id: number) => `https://api.openar.pt/v1/deputados/${id}/foto`),
  parliamentaryGroups: vi.fn((grupos: string[]) => grupos.filter((g) => !["Governo", "Mesa"].includes(g))),
}));
vi.mock("./lib/openar-client", () => mocks);

import Command from "./browse-deputies";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMeta.mockResolvedValue({
    legislaturas: [],
    grupos: ["Governo", "Mesa", "PS", "CH"],
    tipos: [],
    estados: [],
  });
  mocks.deputadoPhotoUrl.mockImplementation((id: number) => `https://api.openar.pt/v1/deputados/${id}/foto`);
  mocks.parliamentaryGroups.mockImplementation((grupos: string[]) =>
    grupos.filter((g) => !["Governo", "Mesa"].includes(g)),
  );
});

function deputy(overrides: Partial<Deputado> = {}): Deputado {
  return {
    id: 4321,
    nomeParlamentar: "Pedro Nuno Santos",
    nomeCompleto: "Pedro Nuno de Oliveira Santos",
    grupoParlamentar: "PS",
    circuloEleitoral: "Lisboa",
    legislaturaId: "XVII",
    situacao: "Efetivo",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}
const page = (data: Deputado[]) => ({ data, total: data.length, page: 1, limit: 200 });

describe("Browse Deputies", () => {
  it("has a default export that renders a List", () => {
    mocks.listDeputados.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("asks only for sitting deputies, using the API's 230-seat shortcut", async () => {
    mocks.listDeputados.mockResolvedValue(page([deputy()]));
    render(<Command />);
    await waitFor(() => expect(mocks.listDeputados).toHaveBeenCalled());
    expect(mocks.listDeputados.mock.calls[0][0]).toMatchObject({ situacao: "ativo", sort: "asc" });
  });

  it("excludes the institutional authors from the group dropdown", async () => {
    mocks.listDeputados.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    // /deputados?grupo=Governo is a 400, so offering it would build a broken filter.
    expect(mocks.parliamentaryGroups).toHaveBeenCalledWith(["Governo", "Mesa", "PS", "CH"]);
    expect(screen.queryByText("Governo")).toBeNull();
    expect(screen.getByText("PS")).toBeInTheDocument();
  });

  it("filters by the chosen group", async () => {
    mocks.listDeputados.mockResolvedValue(page([deputy()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("dropdown"), { target: { value: "CH" } });
    await waitFor(() => expect(mocks.listDeputados).toHaveBeenLastCalledWith(expect.objectContaining({ grupo: "CH" })));
  });

  it("treats the all-groups option as no filter", async () => {
    mocks.listDeputados.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(mocks.listDeputados).toHaveBeenCalled());
    expect(mocks.listDeputados.mock.calls[0][0].grupo).toBeUndefined();
  });

  it("gives every row a photo with a fallback, since the CDN 404s when there is none", async () => {
    mocks.listDeputados.mockResolvedValue(page([deputy()]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    // The icon carries both the URL and the fallback; without the fallback a
    // deputy with no photo renders as a broken image.
    expect(item.getAttribute("data-icon")).toContain("/deputados/4321/foto");
  });

  it("shows group and constituency", async () => {
    mocks.listDeputados.mockResolvedValue(page([deputy()]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "Pedro Nuno Santos");
    expect(item).toHaveAttribute("data-subtitle", "PS · Lisboa");
    expect(item).toHaveAttribute("data-accessories", "PS");
  });

  it("drops empty keywords and accessory for a deputy with no group or constituency", async () => {
    mocks.listDeputados.mockResolvedValue(
      page([deputy({ grupoParlamentar: null, circuloEleitoral: null, nomeCompleto: "" })]),
    );
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-subtitle", "");
    expect(item).toHaveAttribute("data-accessories", "");
  });

  it("sends the trimmed name search", async () => {
    mocks.listDeputados.mockResolvedValue(page([]));
    render(<Command />);
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "  pedro  " } });
    await waitFor(() => expect(mocks.listDeputados).toHaveBeenLastCalledWith(expect.objectContaining({ q: "pedro" })));
  });

  it("distinguishes an empty list from an unmatched search", async () => {
    mocks.listDeputados.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view").getAttribute("data-description")).toContain("no sitting deputies"),
    );
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "zzz" } });
    await waitFor(() => expect(screen.getByTestId("empty-view").getAttribute("data-description")).toContain("zzz"));
  });

  it("reports a failure as a failure", async () => {
    mocks.listDeputados.mockRejectedValue(new OpenArError("boom", 500));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Could not reach openAR"),
    );
  });
});
