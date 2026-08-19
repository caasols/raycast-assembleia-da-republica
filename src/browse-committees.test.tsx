/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "./lib/errors";
import type { Comissao } from "./lib/types";

const mocks = vi.hoisted(() => ({ getPageSize: vi.fn(), listComissoes: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listComissoes: mocks.listComissoes }));
vi.mock("./lib/preferences", () => ({ getPageSize: mocks.getPageSize }));

import Command from "./browse-committees";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPageSize.mockReturnValue(200);
});

const page = (data: Comissao[], total = data.length) => ({ data, total, page: 1, limit: 200 });
const COMMITTEE: Comissao = { id: 42, sigla: "CACDLG", nome: "Comissão de Assuntos Constitucionais" };
const actionTitles = () => screen.getAllByTestId("action").map((a) => a.getAttribute("data-title"));

describe("Browse Committees", () => {
  it("has a default export that renders a List", () => {
    mocks.listComissoes.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
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
