/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "../lib/errors";

const mocks = vi.hoisted(() => ({ getIniciativa: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getIniciativa: mocks.getIniciativa }));

import { InitiativeDetail } from "./initiative-detail";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const INITIATIVE = {
  id: 42,
  legislaturaId: "XVII",
  numero: "1/XVII",
  tipo: "J",
  tipoDesc: "Projeto de Lei",
  titulo: "Altera o Código do Trabalho",
  epigrafe: null,
  dataEntrada: "2026-03-04",
  dataFim: null,
  estado: "Lei (Publicação DR)",
  linkTexto: "https://example.pt/texto.pdf",
  updatedAt: "2026-08-01T00:00:00Z",
  autores: [{ tipo: "grupo" as const, deputadoId: null, grupoParlamentar: "PS", nome: null }],
  eventos: [],
};

const detail = () => screen.getByTestId("detail");
const actionTitles = () => screen.queryAllByTestId("action").map((a) => a.getAttribute("data-title"));

describe("InitiativeDetail", () => {
  it("shows the title it was handed immediately, rather than a blank pane", () => {
    mocks.getIniciativa.mockReturnValue(new Promise(() => {}));
    render(<InitiativeDetail id={42} title="Altera o Código do Trabalho" />);
    // The caller already knows the title; making the user wait for it would be
    // a needless blank frame.
    expect(detail().getAttribute("data-markdown")).toContain("Altera o Código do Trabalho");
    expect(detail()).toHaveAttribute("data-loading", "true");
  });

  it("fetches the initiative it was given", async () => {
    mocks.getIniciativa.mockResolvedValue(INITIATIVE);
    render(<InitiativeDetail id={42} title="x" />);
    await waitFor(() => expect(mocks.getIniciativa).toHaveBeenCalledWith(42));
  });

  it("renders the full record once loaded", async () => {
    mocks.getIniciativa.mockResolvedValue(INITIATIVE);
    render(<InitiativeDetail id={42} title="x" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("**Authors:** PS"));
    expect(detail().getAttribute("data-markdown")).toContain("**Stage:** Lei (Publicação DR)");
  });

  it("titles the navigation with the reference once it knows it", async () => {
    mocks.getIniciativa.mockResolvedValue(INITIATIVE);
    render(<InitiativeDetail id={42} title="x" />);
    await waitFor(() => expect(detail()).toHaveAttribute("data-navigation-title", "Projeto de Lei 1/XVII"));
  });

  it("offers the full text when the record has one", async () => {
    mocks.getIniciativa.mockResolvedValue(INITIATIVE);
    render(<InitiativeDetail id={42} title="x" />);
    await waitFor(() => expect(actionTitles()).toContain("Open Full Text"));
  });

  it("offers no full-text action when the record has none", async () => {
    mocks.getIniciativa.mockResolvedValue({ ...INITIATIVE, linkTexto: null });
    render(<InitiativeDetail id={42} title="x" />);
    await waitFor(() => expect(actionTitles()).toContain("Copy Title"));
    expect(actionTitles()).not.toContain("Open Full Text");
  });

  it("can retry a failed load without popping back to the list", async () => {
    mocks.getIniciativa.mockRejectedValue(new OpenArError("boom", 502));
    render(<InitiativeDetail id={42} title="x" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("Could not load"));
    const retry = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Retry");
    mocks.getIniciativa.mockResolvedValue(INITIATIVE);
    fireEvent.click(retry as HTMLElement);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("**Authors:** PS"));
  });

  it("says the load failed, keeping the title so the pane is not just an error", async () => {
    mocks.getIniciativa.mockRejectedValue(new OpenArError("gateway exploded", 502));
    render(<InitiativeDetail id={42} title="Altera o Código do Trabalho" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("Could not load this initiative"));
    expect(detail().getAttribute("data-markdown")).toContain("gateway exploded");
    expect(detail().getAttribute("data-markdown")).toContain("Altera o Código do Trabalho");
  });
});
