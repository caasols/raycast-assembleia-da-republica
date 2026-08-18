/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "./lib/errors";
import type { Peticao } from "./lib/types";

const mocks = vi.hoisted(() => ({ listPeticoes: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listPeticoes: mocks.listPeticoes }));

import Command from "./search-petitions";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function petition(overrides: Partial<Peticao> = {}): Peticao {
  return {
    id: 1,
    legislaturaId: "XVII",
    numero: "12/XVII",
    assunto: "Pela reabilitação da linha do Tua",
    autor: "Associação de Moradores",
    dataEntrada: "2026-02-10",
    assinaturas: 8421,
    assinaturasInicial: 4,
    situacao: "Admitida",
    urlTexto: "https://example.pt/peticao.pdf",
    dataDebate: null,
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}
const page = (data: Peticao[]) => ({ data, total: data.length, page: 1, limit: 50 });
const actionTitles = () => screen.getAllByTestId("action").map((a) => a.getAttribute("data-title"));

describe("Search Petitions", () => {
  it("has a default export that renders a List", () => {
    mocks.listPeticoes.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("loads recent petitions before anything is typed", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition()]));
    render(<Command />);
    await waitFor(() => expect(mocks.listPeticoes).toHaveBeenCalled());
    expect(mocks.listPeticoes.mock.calls[0][0].q).toBeUndefined();
  });

  it("sends the trimmed query", async () => {
    mocks.listPeticoes.mockResolvedValue(page([]));
    render(<Command />);
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "  tua  " } });
    await waitFor(() => expect(mocks.listPeticoes).toHaveBeenLastCalledWith(expect.objectContaining({ q: "tua" })));
  });

  it("shows the subject, author and signature count", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition()]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "Pela reabilitação da linha do Tua");
    expect(item).toHaveAttribute("data-subtitle", "Associação de Moradores");
    expect(item).toHaveAttribute("data-accessories", "8,421 signatures");
  });

  it("falls back to a placeholder title for a petition with no subject", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition({ assunto: null })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-title", "Untitled petition"));
  });

  it("drops empty keywords and the signature accessory when the record lacks them", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition({ numero: null, situacao: null, assinaturas: null })]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    // No signature count is different from zero signatures, so nothing is shown.
    expect(item).toHaveAttribute("data-accessories", "");
  });

  it("shows no author subtitle when the petition records none", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition({ autor: null })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).not.toHaveAttribute("data-subtitle"));
  });

  it("offers the petition text when one is published", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition()]));
    render(<Command />);
    await waitFor(() => expect(actionTitles()).toContain("Open Petition Text"));
  });

  it("offers no text action when none is published", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition({ urlTexto: null })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    expect(actionTitles()).not.toContain("Open Petition Text");
  });

  it("distinguishes an empty corpus from an unmatched search", async () => {
    mocks.listPeticoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No petitions"));
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "zzz" } });
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No matching petitions"),
    );
  });

  it("reports a failure as a failure", async () => {
    mocks.listPeticoes.mockRejectedValue(new OpenArError("boom", 500));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Could not reach openAR"),
    );
  });
});
