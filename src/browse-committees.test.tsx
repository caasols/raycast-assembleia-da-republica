/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { OpenArError } from "./lib/errors";
import type { Comissao } from "./lib/types";

const mocks = vi.hoisted(() => ({ useLegislatures: vi.fn(), getPageSize: vi.fn(), listComissoes: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listComissoes: mocks.listComissoes }));
vi.mock("./lib/preferences", () => ({ getPageSize: mocks.getPageSize }));
vi.mock("./components/use-legislatures", () => ({
  useLegislatures: mocks.useLegislatures,
  ALL_LEGISLATURES: "",
}));

import Command from "./browse-committees";
import { page } from "../test/fixtures";

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
  mocks.getPageSize.mockReturnValue(200);
});

const COMMITTEE: Comissao = { id: 42, sigla: "CACDLG", nome: "Comissão de Assuntos Constitucionais" };
const actionTitles = () => screen.getAllByTestId("action").map((a) => a.getAttribute("data-title"));

describe("Browse Committees", () => {
  it("has a default export that renders a List", () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("sends no legislature filter when widened to all", async () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("dropdown"), { target: { value: "" } });
    // "" means no filter at all, not a legislature literally named "".
    await waitFor(() =>
      expect(mocks.listComissoes).toHaveBeenLastCalledWith(expect.objectContaining({ legislatura: undefined })),
    );
  });

  it("loads the next page on demand", async () => {
    mocks.listComissoes.mockResolvedValue(page([COMMITTEE], 500));
    render(<Command />);
    fireEvent.click(await waitFor(() => screen.getByTestId("load-more")));
    await waitFor(() => expect(mocks.listComissoes).toHaveBeenCalledTimes(2));
    expect(mocks.listComissoes.mock.calls[1][0].page).toBe(2);
  });

  it("shows the name with the acronym beneath it", async () => {
    mocks.listComissoes.mockResolvedValue(page([COMMITTEE]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "Comissão de Assuntos Constitucionais");
    expect(item).toHaveAttribute("data-subtitle", "CACDLG");
  });

  it("falls back to the acronym when a committee has no name", async () => {
    mocks.listComissoes.mockResolvedValue(page([{ id: 9, sigla: "COFMA", nome: null }]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "COFMA");
    // The acronym is the title now, so repeating it as a subtitle would be
    // noise — the attribute is absent rather than empty.
    expect(item).not.toHaveAttribute("data-subtitle");
  });

  it("falls back to the id when a committee has neither name nor acronym", async () => {
    mocks.listComissoes.mockResolvedValue(page([{ id: 9, sigla: null, nome: null }]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-title", "Committee 9"));
  });

  it("offers the acronym as its own copy action only when there is one", async () => {
    mocks.listComissoes.mockResolvedValue(page([COMMITTEE]));
    const { unmount } = render(<Command />);
    await waitFor(() => expect(actionTitles()).toContain("Copy Acronym"));
    unmount();

    mocks.listComissoes.mockResolvedValue(page([{ id: 9, sigla: null, nome: "Unnamed" }]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    expect(actionTitles()).not.toContain("Copy Acronym");
  });

  it("sends the trimmed query", async () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: " saúde " } });
    await waitFor(() => expect(mocks.listComissoes).toHaveBeenLastCalledWith(expect.objectContaining({ q: "saúde" })));
  });

  it("treats a whitespace-only query as no query, not a search for spaces", async () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "   " } });
    await waitFor(() => expect(mocks.listComissoes).toHaveBeenCalledTimes(2));
    expect(mocks.listComissoes.mock.calls[1][0].q).toBeUndefined();
  });

  it("starts on the preference's legislature, in alphabetical order", async () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(mocks.listComissoes).toHaveBeenCalled());
    expect(mocks.listComissoes.mock.calls[0][0]).toMatchObject({ legislatura: "XVII", sort: "asc" });
  });

  it("makes each row findable by its acronym", async () => {
    mocks.listComissoes.mockResolvedValue(page([COMMITTEE]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-keywords", "CACDLG"));
  });

  it("copies the committee's name", async () => {
    mocks.listComissoes.mockResolvedValue(page([COMMITTEE]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    const copy = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Copy Name");
    expect(copy?.getAttribute("data-content")).toBe("Comissão de Assuntos Constitucionais");
  });

  it("names the failed search in the unmatched empty state", async () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "zzz" } });
    await waitFor(() => expect(screen.getByTestId("empty-view").getAttribute("data-description")).toContain("zzz"));
  });

  it("distinguishes an empty list from an unmatched search", async () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No committees"));
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "zzz" } });
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No matching committees"),
    );
  });

  it("reports a failure as a failure", async () => {
    mocks.listComissoes.mockRejectedValue(new OpenArError("boom", 500));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Could not reach openAR"),
    );
  });
});
