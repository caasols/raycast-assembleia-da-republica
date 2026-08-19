/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { OpenArError } from "./lib/errors";
import type { VotacaoListItem } from "./lib/types";

const mocks = vi.hoisted(() => ({ listVotacoes: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));

import Command from "./what-was-the-vote-today";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

function vote(overrides: Partial<VotacaoListItem> = {}): VotacaoListItem {
  return {
    id: "v1",
    data: "2026-08-18",
    resultado: "Aprovado",
    unanime: false,
    reuniao: null,
    tipoReuniao: "RP",
    descricao: null,
    aFavor: ["PS", "PSD"],
    contra: ["CH"],
    abstencao: ["IL"],
    ausencias: [],
    detalhe: null,
    iniciativaId: 42,
    iniciativaTitulo: "Orçamento do Estado para 2027",
    iniciativaNumero: "1/XVII",
    iniciativaTipo: "P",
    legislaturaId: "XVII",
    ...overrides,
  };
}

function page(data: VotacaoListItem[]) {
  return { data, total: data.length, page: 1, limit: 200 };
}

describe("Browse Today's Votes", () => {
  // Guards the failure this repo shipped once: the command file was 0 bytes,
  // `ray build` reported success, and the command was dead on invocation.
  it("has a default export that renders a List", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("asks for exactly today, both ends of the range", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    const params = mocks.listVotacoes.mock.calls[0][0];
    expect(params.dataInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // A single day, not an open-ended range that would return the whole archive.
    expect(params.dataFim).toBe(params.dataInicio);
  });

  it("renders one row per vote, titled by the initiative", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote(), vote({ id: "v2", iniciativaTitulo: "Lei de Bases da Saúde" })]));
    render(<Command />);
    await waitFor(() => expect(screen.getAllByTestId("list-item")).toHaveLength(2));
    expect(screen.getAllByTestId("list-item")[0]).toHaveAttribute("data-title", "Orçamento do Estado para 2027");
  });

  it("shows the initiative reference as the subtitle", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-subtitle", "P 1/XVII"));
  });

  it("marks unanimity in the accessory, not just the result", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ unanime: true })]));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("list-item")).toHaveAttribute("data-accessories", "Aprovado (unanimous)"),
    );
  });

  it("tints an approved vote green and a rejected one red, so a day is scannable", async () => {
    mocks.listVotacoes.mockResolvedValue(
      page([vote({ id: "a", resultado: "Aprovado" }), vote({ id: "r", resultado: "Rejeitado" })]),
    );
    render(<Command />);
    await waitFor(() => expect(screen.getAllByTestId("list-item")).toHaveLength(2));
    const [approved, rejected] = screen.getAllByTestId("list-item");
    expect(approved.getAttribute("data-icon")).toContain("Green");
    expect(rejected.getAttribute("data-icon")).toContain("Red");
  });

  it("gives Prejudicado neither colour, being neither a pass nor a defeat", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ resultado: "Prejudicado" })]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item.getAttribute("data-icon")).not.toContain("Green");
    expect(item.getAttribute("data-icon")).not.toContain("Red");
  });

  it("puts the party breakdown in the detail pane", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    const detail = await waitFor(() => screen.getByTestId("item-detail"));
    expect(detail.getAttribute("data-markdown")).toContain("### In favour\nPS, PSD");
    expect(detail.getAttribute("data-markdown")).toContain("### Against\nCH");
  });

  it("opens the detail pane only when there is something to show in it", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    const { unmount } = render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "false"));
    unmount();

    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "true"));
  });

  it("keys rows by initiative and vote together, since vote ids repeat across initiatives", async () => {
    // Two different initiatives, each with a vote called "1" — a bare id key
    // would collide and React would drop a row.
    mocks.listVotacoes.mockResolvedValue(
      page([vote({ id: "1", iniciativaId: 1 }), vote({ id: "1", iniciativaId: 2, iniciativaTitulo: "Another bill" })]),
    );
    render(<Command />);
    await waitFor(() => expect(screen.getAllByTestId("list-item")).toHaveLength(2));
  });

  it("says parliament did not vote, rather than implying a failure, on a quiet day", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty).toHaveAttribute("data-title", "No votes today");
    expect(empty.getAttribute("data-description")).toContain("no plenary votes");
  });

  it("reports a failure as a failure instead of as an empty day", async () => {
    mocks.listVotacoes.mockRejectedValue(new OpenArError("openAR returned an unexpected response shape", 500));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    // The shared RequestEmptyView owns this copy now, so it reads the same in
    // every openAR-backed list rather than being re-worded per command.
    expect(empty).toHaveAttribute("data-title", "Could not reach openAR");
    expect(empty.getAttribute("data-description")).toContain("unexpected response shape");
  });

  it("tells the user how long to wait when openAR says so", async () => {
    mocks.listVotacoes.mockRejectedValue(new OpenArError("Too many requests", 429, 60));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty).toHaveAttribute("data-title", "Too many requests");
    expect(empty.getAttribute("data-description")).toContain("60 seconds");
  });

  it("does not invent a delay when the rate-limit response carried none", async () => {
    mocks.listVotacoes.mockRejectedValue(new OpenArError("Too many requests", 429));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty.getAttribute("data-description")).toContain("shortly");
    expect(empty.getAttribute("data-description")).not.toMatch(/\d+ seconds/);
  });

  it("surfaces a non-Error rejection as text rather than [object Object]", async () => {
    mocks.listVotacoes.mockRejectedValue("relay unreachable");
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty.getAttribute("data-description")).toContain("relay unreachable");
  });
});
