/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "./lib/errors";
import type { VotacaoListItem } from "./lib/types";

const mocks = vi.hoisted(() => ({ listVotacoes: vi.fn(), useParties: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));
vi.mock("./components/use-parties", () => ({ useParties: mocks.useParties }));

import Command from "./browse-party-votes";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.useParties.mockReturnValue(["Governo", "PS", "CH"]);
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
    aFavor: ["PS"],
    contra: ["CH"],
    abstencao: [],
    ausencias: [],
    detalhe: null,
    iniciativaId: 42,
    iniciativaTitulo: "Orçamento do Estado",
    iniciativaNumero: "1/XVII",
    iniciativaTipo: "P",
    legislaturaId: "XVII",
    ...overrides,
  };
}
const page = (data: VotacaoListItem[], total = data.length) => ({ data, total, page: 1, limit: 100 });
const choose = (value: string) => fireEvent.change(screen.getByTestId("dropdown"), { target: { value } });

describe("Browse Party Votes", () => {
  it("has a default export that renders a List", () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("asks for nothing until a party is chosen", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Choose a party"));
    // No party means no query — the command must not fetch the whole archive.
    expect(mocks.listVotacoes).not.toHaveBeenCalled();
  });

  it("asks for the author-scoped party list, which /votacoes accepts", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    // Unlike /deputados, /votacoes?grupo= takes Governo, PAR, Madeira, Açores
    // and Mesa, so this dropdown must not filter them out.
    await waitFor(() => expect(mocks.useParties).toHaveBeenCalledWith("authors"));
    expect(screen.getAllByText("Governo").length).toBeGreaterThan(0);
  });

  it("filters by the chosen party and position", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("CH|contra");
    await waitFor(() =>
      expect(mocks.listVotacoes).toHaveBeenLastCalledWith(expect.objectContaining({ contra: "CH", sort: "desc" })),
    );
  });

  it("uses the API's own filter rather than fetching everything and filtering here", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|abstencao");
    await waitFor(() =>
      expect(mocks.listVotacoes).toHaveBeenLastCalledWith(expect.objectContaining({ abstencao: "PS" })),
    );
  });

  it("loads the next page of a party's votes on demand", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()], 300));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|a_favor");
    fireEvent.click(await waitFor(() => screen.getByTestId("load-more")));
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalledTimes(2));
    expect(mocks.listVotacoes.mock.calls[1][0].page).toBe(2);
  });

  it("does not fetch anything before a party is chosen, even paginated", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toBeInTheDocument());
    expect(mocks.listVotacoes).not.toHaveBeenCalled();
    expect(screen.queryByTestId("load-more")).toBeNull();
  });

  it("renders the votes it gets back", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|a_favor");
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "Orçamento do Estado");
    expect(item).toHaveAttribute("data-accessories", "18 August 2026");
  });

  it("falls back to the result when a vote carries no date", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ data: null, unanime: true })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|a_favor");
    await waitFor(() =>
      expect(screen.getByTestId("list-item")).toHaveAttribute("data-accessories", "Aprovado (unanimous)"),
    );
  });

  it("goes back to the prompt when the party is cleared", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|a_favor");
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());

    // The placeholder option carries no "party|position" pair at all.
    choose("");
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Choose a party"));
  });

  it("says the party has no matching votes, rather than implying a failure", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("CH|abstencao");
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No votes found"));
    expect(screen.getByTestId("empty-view").getAttribute("data-description")).toContain("CH");
  });

  it("reports a failure as a failure", async () => {
    mocks.listVotacoes.mockRejectedValue(new OpenArError("boom", 500));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|a_favor");
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Could not reach openAR"),
    );
  });
});
