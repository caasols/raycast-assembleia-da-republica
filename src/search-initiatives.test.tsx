/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "./lib/errors";
import type { Iniciativa } from "./lib/types";

const mocks = vi.hoisted(() => ({ listIniciativas: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listIniciativas: mocks.listIniciativas }));

import Command from "./search-initiatives";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function initiative(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
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
    ...overrides,
  };
}

const page = (data: Iniciativa[]) => ({ data, total: data.length, page: 1, limit: 50 });

function search(text: string) {
  fireEvent.change(screen.getByTestId("search-bar"), { target: { value: text } });
}

describe("Search Initiatives", () => {
  it("has a default export that renders a List", async () => {
    mocks.listIniciativas.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("loads recent initiatives before anything is typed, rather than showing a blank screen", async () => {
    mocks.listIniciativas.mockResolvedValue(page([initiative()]));
    render(<Command />);
    await waitFor(() => expect(mocks.listIniciativas).toHaveBeenCalled());
    // No `q` at all — an empty string would search for the empty string.
    expect(mocks.listIniciativas.mock.calls[0][0].q).toBeUndefined();
    expect(mocks.listIniciativas.mock.calls[0][0].sort).toBe("desc");
  });

  it("sends what the user typed as `q`", async () => {
    mocks.listIniciativas.mockResolvedValue(page([]));
    render(<Command />);
    search("trabalho");
    await waitFor(() =>
      expect(mocks.listIniciativas).toHaveBeenLastCalledWith(expect.objectContaining({ q: "trabalho" })),
    );
  });

  it("trims the query, so trailing spaces do not become a different search", async () => {
    mocks.listIniciativas.mockResolvedValue(page([]));
    render(<Command />);
    search("  trabalho  ");
    await waitFor(() =>
      expect(mocks.listIniciativas).toHaveBeenLastCalledWith(expect.objectContaining({ q: "trabalho" })),
    );
  });

  it("treats a whitespace-only query as no query", async () => {
    mocks.listIniciativas.mockResolvedValue(page([]));
    render(<Command />);
    search("   ");
    await waitFor(() => expect(mocks.listIniciativas).toHaveBeenCalledTimes(2));
    expect(mocks.listIniciativas.mock.calls[1][0].q).toBeUndefined();
  });

  it("throttles, because a request per keystroke would burn the 100/min budget", async () => {
    mocks.listIniciativas.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toBeInTheDocument());
    // Native filtering is off once onSearchTextChange is set — the server has
    // already matched, and filtering again locally would hide returned rows.
    expect(screen.getByTestId("list")).toHaveAttribute("data-native-filtering", "false");
  });

  it("renders one row per initiative, with the human-readable reference", async () => {
    mocks.listIniciativas.mockResolvedValue(page([initiative()]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "Altera o Código do Trabalho");
    expect(item).toHaveAttribute("data-subtitle", "Projeto de Lei 1/XVII");
  });

  it("shows the entry date as an accessory", async () => {
    mocks.listIniciativas.mockResolvedValue(page([initiative()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-accessories", "4 March 2026"));
  });

  it("shows no date accessory when the record carries no entry date", async () => {
    mocks.listIniciativas.mockResolvedValue(page([initiative({ dataEntrada: null })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-accessories", ""));
  });

  it("labels the stage as a stage in the detail pane, never as a result", async () => {
    mocks.listIniciativas.mockResolvedValue(page([initiative()]));
    render(<Command />);
    const detail = await waitFor(() => screen.getByTestId("item-detail"));
    expect(detail.getAttribute("data-markdown")).toContain("**Stage:** Lei (Publicação DR)");
  });

  function actionTitles(): (string | null)[] {
    return screen.getAllByTestId("action").map((a) => a.getAttribute("data-title"));
  }

  it("offers the full text, pointed at the record's own link", async () => {
    mocks.listIniciativas.mockResolvedValue(page([initiative()]));
    render(<Command />);
    await waitFor(() => expect(actionTitles()).toContain("Open Full Text"));
    const open = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Open Full Text");
    expect(open).toHaveAttribute("data-url", "https://example.pt/texto.pdf");
  });

  it("offers no full-text action when the record has no link", async () => {
    mocks.listIniciativas.mockResolvedValue(page([initiative({ linkTexto: null })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    // The copy actions are still there; only the one with nothing to open is gone.
    expect(actionTitles()).not.toContain("Open Full Text");
    expect(actionTitles()).toContain("Copy Title");
  });

  it("distinguishes an empty corpus from an unmatched search", async () => {
    mocks.listIniciativas.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No initiatives"));

    search("zzzz");
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No matching initiatives"),
    );
    expect(screen.getByTestId("empty-view").getAttribute("data-description")).toContain("zzzz");
  });

  it("reports a failure as a failure rather than as an empty search", async () => {
    mocks.listIniciativas.mockRejectedValue(new OpenArError("gateway exploded", 502));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty).toHaveAttribute("data-title", "Could not reach openAR");
  });

  it("passes on a rate limit with the wait openAR asked for", async () => {
    mocks.listIniciativas.mockRejectedValue(new OpenArError("Too many requests", 429, 60));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty).toHaveAttribute("data-title", "Too many requests");
    expect(empty.getAttribute("data-description")).toContain("60 seconds");
  });
});
