/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { OpenArError } from "./lib/errors";

const mocks = vi.hoisted(() => ({ useLegislatures: vi.fn(), getPageSize: vi.fn(), listPeticoes: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listPeticoes: mocks.listPeticoes }));
vi.mock("./lib/preferences", () => ({ getPageSize: mocks.getPageSize }));
vi.mock("./components/use-legislatures", () => ({
  useLegislatures: mocks.useLegislatures,
  ALL_LEGISLATURES: "",
}));

import Command from "./search-petitions";
import { page, petition } from "../test/fixtures";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  // Stateful like the real hook: the dropdown tests change the selection and
  // expect a refetch, which a fixed return value cannot produce.
  mocks.useLegislatures.mockImplementation(() => {
    const [chosenId, setSelectedId] = useState<string | undefined>(undefined);
    return {
      legislatures: [{ id: "XVII", nome: "XVII Legislatura" }],
      initialId: "XVII",
      selectedId: chosenId ?? "XVII",
      setSelectedId,
    };
  });
  mocks.getPageSize.mockReturnValue(50);
});

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

  it("treats a whitespace-only query as no query, not a search for spaces", async () => {
    mocks.listPeticoes.mockResolvedValue(page([]));
    render(<Command />);
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "   " } });
    await waitFor(() => expect(mocks.listPeticoes).toHaveBeenCalledTimes(2));
    expect(mocks.listPeticoes.mock.calls[1][0].q).toBeUndefined();
  });

  it("starts on the preference's legislature, newest petitions first", async () => {
    mocks.listPeticoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(mocks.listPeticoes).toHaveBeenCalled());
    expect(mocks.listPeticoes.mock.calls[0][0]).toMatchObject({ legislatura: "XVII", sort: "desc" });
  });

  it("makes each row findable by number and status", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition()]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    const keywords = item.getAttribute("data-keywords");
    expect(keywords).toContain("12/XVII");
    expect(keywords).toContain("Admitida");
  });

  it("opens the detail pane only when there are rows to show in it", async () => {
    mocks.listPeticoes.mockResolvedValue(page([]));
    const { unmount } = render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "false"));
    unmount();

    mocks.listPeticoes.mockResolvedValue(page([petition()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "true"));
  });

  it("copies the subject, which is the petition's identity", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    const copy = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Copy Subject");
    expect(copy?.getAttribute("data-content")).toBe("Pela reabilitação da linha do Tua");
  });

  it("sends no legislature filter when widened to all", async () => {
    mocks.listPeticoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("dropdown"), { target: { value: "" } });
    // "" means no filter at all, not a legislature literally named "".
    await waitFor(() =>
      expect(mocks.listPeticoes).toHaveBeenLastCalledWith(expect.objectContaining({ legislatura: undefined })),
    );
  });

  it("loads the next page on demand", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition()], 400));
    render(<Command />);
    fireEvent.click(await waitFor(() => screen.getByTestId("load-more")));
    await waitFor(() => expect(mocks.listPeticoes).toHaveBeenCalledTimes(2));
    expect(mocks.listPeticoes.mock.calls[1][0].page).toBe(2);
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

  it("pushes into the petition, so the list is not a dead end", async () => {
    mocks.listPeticoes.mockResolvedValue(page([petition()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    expect(actionTitles()).toContain("Show Details");
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
