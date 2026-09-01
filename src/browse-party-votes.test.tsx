/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "./lib/errors";

const mocks = vi.hoisted(() => ({
  useLegislatures: vi.fn(),
  getPageSize: vi.fn(),
  listVotacoes: vi.fn(),
  useParties: vi.fn(),
}));
vi.mock("./lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));
vi.mock("./components/use-parties", () => ({ useParties: mocks.useParties }));
vi.mock("./lib/preferences", () => ({ getPageSize: mocks.getPageSize }));
vi.mock("./components/use-legislatures", () => ({
  useLegislatures: mocks.useLegislatures,
  ALL_LEGISLATURES: "",
}));

import Command from "./browse-party-votes";
import { page, vote } from "../test/fixtures";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.useLegislatures.mockReturnValue({ legislatures: [], initialId: "XVII" });
  mocks.getPageSize.mockReturnValue(100);
  mocks.useParties.mockReturnValue(["Governo", "PS", "CH"]);
});

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
    choose("CH|against");
    await waitFor(() =>
      expect(mocks.listVotacoes).toHaveBeenLastCalledWith(expect.objectContaining({ contra: "CH", sort: "desc" })),
    );
  });

  it("sends the in-favour filter for the default position — the one that once vanished", async () => {
    // D101: the dropdown id "a_favor" used to be passed as a computed key that
    // the client (expecting `aFavor`) silently ignored, so the DEFAULT state of
    // this command showed the whole archive as the party's in-favour votes.
    // This asserts the exact parameter, for the exact position that broke.
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    const params = mocks.listVotacoes.mock.calls[0][0];
    expect(params.aFavor).toBe("PS");
    // The wire-cased key must not reappear alongside it.
    expect(params).not.toHaveProperty("a_favor");
  });

  it("keeps the chosen party selected in the dropdown", async () => {
    // The dropdown's items carry a composite `sigla|position` value, so the
    // controlled `value` must be that same composite. Holding the sigla alone
    // matches no item, and Raycast then renders the placeholder instead of the
    // selection: the party appears unselectable however many times you pick it.
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("CH|against");
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    expect(screen.getByTestId("dropdown")).toHaveValue("CH|against");
  });

  it("uses the API's own filter rather than fetching everything and filtering here", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|abstained");
    await waitFor(() =>
      expect(mocks.listVotacoes).toHaveBeenLastCalledWith(expect.objectContaining({ abstencao: "PS" })),
    );
  });

  it("loads the next page of a party's votes on demand", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()], 300));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
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

  it("scopes to the preference's legislature by default", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    expect(mocks.listVotacoes.mock.calls[0][0].legislatura).toBe("XVII");
  });

  it("tells the user what the prompt state wants from them", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty.getAttribute("data-description")).toContain("Pick a party and a position");
  });

  it("copies a summary carrying the result and breakdown", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    const copy = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Copy Vote Summary");
    expect(copy?.getAttribute("data-content")).toContain("Orçamento do Estado para 2027 — Aprovado.");
    expect(copy?.getAttribute("data-content")).toContain("In favour: PS");
  });

  it("opens the detail pane only when there are rows to show in it", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "false"));
    choose("PS|for");
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "true"));
  });

  it("sends no legislature filter when the preference is set to all legislatures", async () => {
    mocks.useLegislatures.mockReturnValue({ legislatures: [], initialId: "" });
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    expect(mocks.listVotacoes.mock.calls[0][0].legislatura).toBeUndefined();
  });

  it("renders the votes it gets back, in the same row shape as Browse Votes", async () => {
    // D124: same entity, same endpoint, same row. Reference, margin, date.
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "P 1/XVII");
    expect(item).toHaveAttribute("data-subtitle", "2\u00B71\u00B71");
    expect(item).toHaveAttribute("data-accessories", "18 August 2026");
  });

  it("falls back to the initiative title if a vote carries no reference at all", async () => {
    // A blank title would render an unclickable row.
    mocks.listVotacoes.mockResolvedValue(page([vote({ iniciativaTipo: "", iniciativaNumero: "" })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    await waitFor(() =>
      expect(screen.getByTestId("list-item")).toHaveAttribute("data-title", "Orçamento do Estado para 2027"),
    );
  });

  it("shows no margin when a vote carries no recorded breakdown", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item.getAttribute("data-subtitle")).toBeFalsy();
  });

  it("keeps the initiative title searchable, now that it has left the row", async () => {
    // This list had no keywords at all before D124, so the title was its only
    // searchable text. Moving it off the row without this would have silently
    // ended filtering here (D121).
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item.getAttribute("data-keywords")).toContain("Orçamento do Estado para 2027");
  });

  it("drops the date cleanly when a vote carries none, leaving the margin on the left", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ data: null, unanime: true })]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item.getAttribute("data-accessories")).toBe("");
    expect(item).toHaveAttribute("data-subtitle", "2\u00B71\u00B71");
    // Unanimity left the row with the result label; the detail pane still says it.
    expect(screen.getByTestId("item-detail").getAttribute("data-markdown")).toContain("Aprovado (unanimous)");
  });

  it("goes back to the prompt when the party is cleared", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());

    // The placeholder option carries no "party|position" pair at all.
    choose("");
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Choose a party"));
  });

  it("says the party has no matching votes, rather than implying a failure", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("CH|abstained");
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No votes found"));
    expect(screen.getByTestId("empty-view").getAttribute("data-description")).toContain("CH");
  });

  it("reports a failure as a failure", async () => {
    mocks.listVotacoes.mockRejectedValue(new OpenArError("boom", 500));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    choose("PS|for");
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Could not reach openAR"),
    );
  });
});
