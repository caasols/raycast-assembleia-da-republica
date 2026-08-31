/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { OpenArError } from "./lib/errors";

const mocks = vi.hoisted(() => ({ listVotacoes: vi.fn(), useLegislatures: vi.fn(), getPageSize: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listVotacoes: mocks.listVotacoes }));
vi.mock("./lib/preferences", () => ({ getPageSize: mocks.getPageSize }));
vi.mock("./components/use-legislatures", () => ({
  useLegislatures: mocks.useLegislatures,
  ALL_LEGISLATURES: "",
}));

import Command from "./browse-votes";
import { page, vote } from "../test/fixtures";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  mocks.getPageSize.mockReturnValue(50);
  // Stateful like the real hook: the dropdown test changes the selection and
  // expects a refetch, which a fixed return value cannot produce.
  mocks.useLegislatures.mockImplementation(() => {
    const [chosenId, setSelectedId] = useState<string | undefined>(undefined);
    return {
      legislatures: [{ id: "XVII", nome: "XVII Legislatura" }],
      initialId: "XVII",
      selectedId: chosenId ?? "XVII",
      setSelectedId,
    };
  });
});

describe("Browse Votes", () => {
  // Guards the failure this repo shipped once: the command file was 0 bytes,
  // `ray build` reported success, and the command was dead on invocation.
  it("has a default export that renders a List", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("browses the archive rather than one day: no date bounds are sent", async () => {
    // The whole point of D116. Sending either bound pins the list to a window,
    // and parliament sits on ~54 days a year, so a date-bounded default is
    // empty ~85% of the time. Newest-first over the archive is the openAR
    // website's own behaviour.
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    const params = mocks.listVotacoes.mock.calls[0][0];
    expect(params.dataInicio).toBeUndefined();
    expect(params.dataFim).toBeUndefined();
    expect(params.sort).toBe("desc");
  });

  it("filters by the legislature the dropdown is on", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    expect(mocks.listVotacoes.mock.calls[0][0].legislatura).toBe("XVII");
  });

  it("drops the legislature filter when the dropdown is set to all", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("dropdown")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("dropdown"), { target: { value: "" } });
    await waitFor(() => {
      const last = mocks.listVotacoes.mock.calls[mocks.listVotacoes.mock.calls.length - 1][0];
      expect(last.legislatura).toBeUndefined();
    });
  });

  it("pages through the archive rather than capping at one request", async () => {
    // 36,391 votes exist; a single request cannot show them.
    mocks.listVotacoes.mockResolvedValue(page([vote()], 500));
    render(<Command />);
    await waitFor(() => expect(mocks.listVotacoes).toHaveBeenCalled());
    const params = mocks.listVotacoes.mock.calls[0][0];
    expect(params.page).toBe(1);
    expect(params.limit).toBe(50);
  });

  it("renders one row per vote, titled by the reference rather than the initiative", async () => {
    // The titles are long enough that every row truncated to the same stub, so
    // the reference is what actually tells two rows apart.
    mocks.listVotacoes.mockResolvedValue(page([vote(), vote({ id: "v2", iniciativaTitulo: "Lei de Bases da Saúde" })]));
    render(<Command />);
    await waitFor(() => expect(screen.getAllByTestId("list-item")).toHaveLength(2));
    expect(screen.getAllByTestId("list-item")[0]).toHaveAttribute("data-title", "P 1/XVII");
  });

  it("falls back to the initiative title if a vote carries no reference at all", async () => {
    // A blank title would render an unclickable row.
    mocks.listVotacoes.mockResolvedValue(page([vote({ iniciativaTipo: "", iniciativaNumero: "" })]));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("list-item")).toHaveAttribute("data-title", "Orçamento do Estado para 2027"),
    );
  });

  it("puts the margin beside the reference, on the left, not out with the date", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item).toHaveAttribute("data-title", "P 1/XVII");
    expect(item).toHaveAttribute("data-subtitle", "2\u00B71\u00B71");
  });

  it("makes each row findable by number, result and party", async () => {
    // Raycast filters on keywords; without these a user typing "PS" or the
    // initiative number would not narrow the list to this vote.
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    const keywords = item.getAttribute("data-keywords");
    // The title left the row, so filtering by what the vote is ABOUT now
    // depends entirely on it being a keyword. Without this, the change would
    // silently break search.
    expect(keywords).toContain("Orçamento do Estado para 2027");
    expect(keywords).toContain("1/XVII");
    expect(keywords).toContain("Aprovado");
    expect(keywords).toContain("PS");
    expect(keywords).toContain("CH");
  });

  it("copies a summary that names the vote, its result and the breakdown", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    const copy = screen.getAllByTestId("action").find((a) => a.getAttribute("data-title") === "Copy Vote Summary");
    expect(copy?.getAttribute("data-content")).toContain("Orçamento do Estado para 2027 — Aprovado.");
    expect(copy?.getAttribute("data-content")).toContain("In favour: PS, PSD");
  });

  it("leaves the date as the only right-hand column", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-accessories", "18 August 2026"));
  });

  it("keeps the tooltip on the margin after moving it left, since the numbers are cryptic alone", async () => {
    // `subtitle` accepts { value, tooltip } exactly like `title`, so moving the
    // tally out of the accessories does not have to cost its explanation.
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("list-item")).toHaveAttribute(
        "data-subtitle-tooltip",
        "2 in favour, 1 against, 1 abstained",
      ),
    );
  });

  it("omits the margin entirely when no breakdown was recorded", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ aFavor: [], contra: [], abstencao: [], ausencias: [] })]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item.getAttribute("data-subtitle")).toBeFalsy();
    expect(item).toHaveAttribute("data-accessories", "18 August 2026");
  });

  it("still says a vote was unanimous, in the detail pane the row no longer has room for", async () => {
    // The result label left the row with the title. The icon carries approved
    // or rejected, but only the detail pane can say "unanimous".
    mocks.listVotacoes.mockResolvedValue(page([vote({ unanime: true })]));
    render(<Command />);
    const detail = await waitFor(() => screen.getByTestId("item-detail"));
    expect(detail.getAttribute("data-markdown")).toContain("Aprovado (unanimous)");
  });

  it("drops the date cleanly when a vote carries none, leaving the margin on the left", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote({ data: null })]));
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item.getAttribute("data-accessories")).toBe("");
    expect(item).toHaveAttribute("data-subtitle", "2\u00B71\u00B71");
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

  it("puts the party breakdown in the detail pane as tinted tags, in fixed order", async () => {
    mocks.listVotacoes.mockResolvedValue(page([vote()]));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("tag-list")).toBeInTheDocument());
    const tags = screen.getAllByTestId("tag").map((t) => [t.getAttribute("data-text"), t.getAttribute("data-color")]);
    // Fixture: PS+PSD for, CH against, IL abstained. Left to right, not by side.
    expect(tags).toEqual([
      ["PS", "Green"],
      ["IL", "Yellow"],
      ["PSD", "Green"],
      ["CH", "Red"],
    ]);
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

  it("says the filter found nothing, rather than implying a failure", async () => {
    mocks.listVotacoes.mockResolvedValue(page([]));
    render(<Command />);
    const empty = await waitFor(() => screen.getByTestId("empty-view"));
    expect(empty).toHaveAttribute("data-title", "No votes");
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
