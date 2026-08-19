/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "../lib/errors";

const mocks = vi.hoisted(() => ({ getPeticao: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getPeticao: mocks.getPeticao }));

import { PetitionDetail } from "./petition-detail";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const PETITION = {
  id: 1,
  legislaturaId: "XVII",
  numero: "12/XVII",
  assunto: "Linha do Tua",
  autor: "Associação",
  dataEntrada: "2026-02-10",
  assinaturas: 8421,
  assinaturasInicial: 4,
  situacao: "Admitida",
  urlTexto: "https://example.pt/p.pdf",
  dataDebate: null,
  updatedAt: "2026-08-01T00:00:00Z",
};
const detail = () => screen.getByTestId("detail");
const actionTitles = () => screen.queryAllByTestId("action").map((a) => a.getAttribute("data-title"));

describe("PetitionDetail", () => {
  it("shows the subject while loading rather than a blank pane", () => {
    mocks.getPeticao.mockReturnValue(new Promise(() => {}));
    render(<PetitionDetail id={1} subject="Linha do Tua" />);
    expect(detail().getAttribute("data-markdown")).toContain("Linha do Tua");
  });

  it("fetches the petition it was given", async () => {
    mocks.getPeticao.mockResolvedValue(PETITION);
    render(<PetitionDetail id={1} subject="x" />);
    await waitFor(() => expect(mocks.getPeticao).toHaveBeenCalledWith(1));
  });

  it("renders the full record once loaded", async () => {
    mocks.getPeticao.mockResolvedValue({ ...PETITION, comissoes: [{ nome: "Economia", situacao: null }] });
    render(<PetitionDetail id={1} subject="x" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("## Committees"));
  });

  it("offers the text only when one is published", async () => {
    mocks.getPeticao.mockResolvedValue(PETITION);
    const { unmount } = render(<PetitionDetail id={1} subject="x" />);
    await waitFor(() => expect(actionTitles()).toContain("Open Petition Text"));
    unmount();

    mocks.getPeticao.mockResolvedValue({ ...PETITION, urlTexto: null });
    render(<PetitionDetail id={1} subject="x" />);
    await waitFor(() => expect(actionTitles()).toContain("Copy Subject"));
    expect(actionTitles()).not.toContain("Open Petition Text");
  });

  it("can retry a failed load", async () => {
    mocks.getPeticao.mockRejectedValue(new OpenArError("boom", 502));
    render(<PetitionDetail id={1} subject="x" />);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("Could not load this petition"));
    const retry = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Retry");
    mocks.getPeticao.mockResolvedValue(PETITION);
    fireEvent.click(retry as HTMLElement);
    await waitFor(() => expect(detail().getAttribute("data-markdown")).toContain("**Status:** Admitida"));
  });
});
