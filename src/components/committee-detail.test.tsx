/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "../lib/errors";
import type { Iniciativa } from "../lib/types";

const mocks = vi.hoisted(() => ({ getPageSize: vi.fn(), getComissao: vi.fn() }));
vi.mock("../lib/openar-client", () => ({ getComissao: mocks.getComissao }));
vi.mock("../lib/preferences", () => ({ getPageSize: mocks.getPageSize }));

import { CommitteeDetail } from "./committee-detail";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPageSize.mockReturnValue(100);
});

const INITIATIVE: Iniciativa = {
  id: 1,
  legislaturaId: "XVII",
  numero: "1/XVII",
  tipo: "J",
  tipoDesc: "Projeto de Lei",
  titulo: "Altera o Código do Trabalho",
  epigrafe: null,
  dataEntrada: "2026-03-04",
  dataFim: null,
  estado: "Lei (Publicação DR)",
  linkTexto: null,
  updatedAt: "2026-08-01T00:00:00Z",
};
const committee = (data = [INITIATIVE]) => ({
  id: 42,
  sigla: "CACDLG",
  nome: "Comissão de Assuntos Constitucionais",
  legislaturas: ["XVII"],
  total: data.length,
  page: 1,
  limit: 100,
  data,
});

describe("CommitteeDetail", () => {
  it("fetches the committee it was given, newest first", async () => {
    mocks.getComissao.mockResolvedValue(committee());
    render(<CommitteeDetail id={42} name="CACDLG" />);
    await waitFor(() => expect(mocks.getComissao).toHaveBeenCalled());
    expect(mocks.getComissao.mock.calls[0][0]).toBe(42);
    expect(mocks.getComissao.mock.calls[0][1]).toMatchObject({ sort: "desc" });
  });

  it("loads the next page of initiatives on demand", async () => {
    mocks.getComissao.mockResolvedValue({ ...committee(), total: 400 });
    render(<CommitteeDetail id={42} name="CACDLG" />);
    fireEvent.click(await waitFor(() => screen.getByTestId("load-more")));
    await waitFor(() => expect(mocks.getComissao).toHaveBeenCalledTimes(2));
    expect(mocks.getComissao.mock.calls[1][1].page).toBe(2);
  });

  it("lists the initiatives that passed through it", async () => {
    mocks.getComissao.mockResolvedValue(committee());
    render(<CommitteeDetail id={42} name="CACDLG" />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "Altera o Código do Trabalho");
    expect(item).toHaveAttribute("data-subtitle", "Projeto de Lei 1/XVII");
    expect(item).toHaveAttribute("data-accessories", "4 March 2026");
  });

  it("shows no date accessory when an initiative carries none", async () => {
    mocks.getComissao.mockResolvedValue(committee([{ ...INITIATIVE, dataEntrada: null }]));
    render(<CommitteeDetail id={42} name="CACDLG" />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-accessories", ""));
  });

  it("can push further into an initiative, so this is not another dead end", async () => {
    mocks.getComissao.mockResolvedValue(committee());
    render(<CommitteeDetail id={42} name="CACDLG" />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    expect(screen.queryAllByTestId("action").map((a) => a.getAttribute("data-title"))).toContain("Show Details");
  });

  it("opens the detail pane only when there are rows to show in it", async () => {
    mocks.getComissao.mockResolvedValue(committee([]));
    const { unmount } = render(<CommitteeDetail id={42} name="CACDLG" />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "false"));
    unmount();

    mocks.getComissao.mockResolvedValue(committee());
    render(<CommitteeDetail id={42} name="CACDLG" />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "true"));
  });

  it("names the committee in the empty state", async () => {
    mocks.getComissao.mockResolvedValue(committee([]));
    render(<CommitteeDetail id={42} name="CACDLG" />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty).toHaveAttribute("data-title", "No initiatives");
    expect(empty.getAttribute("data-description")).toContain("CACDLG");
  });

  it("reports a failure as a failure", async () => {
    mocks.getComissao.mockRejectedValue(new OpenArError("boom", 500));
    render(<CommitteeDetail id={42} name="CACDLG" />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Could not reach openAR"),
    );
  });
});
