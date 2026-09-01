/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { OpenArError } from "./lib/errors";

const mocks = vi.hoisted(() => ({ getPageSize: vi.fn(), listCarreiras: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listCarreiras: mocks.listCarreiras }));
vi.mock("./lib/preferences", () => ({ getPageSize: mocks.getPageSize }));

import { launchCommand } from "../test/raycast-api-stub";
import Command from "./longest-serving-deputies";
import { career } from "../test/fixtures";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPageSize.mockReturnValue(100);
});

describe("Longest-Serving Deputies", () => {
  it("has a default export that renders a List", () => {
    mocks.listCarreiras.mockResolvedValue({ data: [], stats: null });
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("carries no subtitle, so the name gets the width", async () => {
    // The party and year span used to live here and truncated every name to
    // "1. José C...". Both are in the detail pane; the party is still a keyword.
    mocks.listCarreiras.mockResolvedValue({ data: [career()], stats: null });
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    expect(item.getAttribute("data-subtitle")).toBeFalsy();
    expect(item.getAttribute("data-keywords")).toContain("PCP");
  });

  it("always asks for the API's maximum, whatever the page-size preference says", async () => {
    // D122. The search bar filters only what was fetched, because the endpoint
    // takes no `q`, so fetch size decides whether a search can succeed. Letting
    // a paging preference set it made a deputy at rank 51 unfindable with no
    // visible reason. 25 is set here and must be ignored.
    mocks.getPageSize.mockReturnValue(25);
    mocks.listCarreiras.mockResolvedValue({ data: [], stats: null });
    render(<Command />);
    await waitFor(() => expect(mocks.listCarreiras).toHaveBeenCalledWith(200));
    expect(mocks.getPageSize).not.toHaveBeenCalled();
  });

  it("states the scope in the search bar, before a search can mislead", async () => {
    // The endpoint takes no `q`, so the bar filters only what was fetched. A
    // deputy deeper than the cap would answer "no results", which reads as
    // "never sat in parliament" unless the scope is said up front (D122).
    mocks.listCarreiras.mockResolvedValue({
      data: [career({ totalLegs: 9 }), career({ id: 2, totalLegs: 4 })],
      stats: { totalDeputies: 2586, singleTerm: 1466, avgLegs: 1.9 },
    });
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("search-bar")).toHaveAttribute("placeholder", "Filter the top 2 by name"),
    );
  });

  it("falls back to a plain placeholder before anything has loaded", async () => {
    mocks.listCarreiras.mockResolvedValue({ data: [], stats: null });
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("search-bar")).toHaveAttribute("placeholder", "Filter by name"));
  });
  it("offers every row a way out to the command that can search all 2,586", async () => {
    // Not on an empty state: RequestEmptyView is a wrapper, and whether Raycast
    // shows a wrapper EmptyView once items exist is unverified here. On a row it
    // is reachable however the user got stuck.
    mocks.listCarreiras.mockResolvedValue({ data: [career()], stats: null });
    render(<Command />);
    const action = await waitFor(() => screen.getByText("Search All Deputies"));
    fireEvent.click(action);
    expect(launchCommand).toHaveBeenCalledWith({ name: "browse-deputies", type: "userInitiated" });
  });
  it("numbers the ranking, since the rank is positional rather than a field", async () => {
    mocks.listCarreiras.mockResolvedValue({
      data: [career(), career({ id: 8, nomeParlamentar: "Maria Silva", totalLegs: 9 })],
      stats: null,
    });
    render(<Command />);
    await waitFor(() => expect(screen.getAllByTestId("list-item")).toHaveLength(2));
    const [first, second] = screen.getAllByTestId("list-item");
    expect(first).toHaveAttribute("data-title", "1. António Filipe");
    expect(second).toHaveAttribute("data-title", "2. Maria Silva");
  });

  it("pushes into the deputy it names, rather than ending there", async () => {
    mocks.listCarreiras.mockResolvedValue({ data: [career()], stats: null });
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toBeInTheDocument());
    expect(screen.queryAllByTestId("action").map((a) => a.getAttribute("data-title"))).toContain("Show Deputy");
  });

  it("shows the legislature count as the accessory", async () => {
    mocks.listCarreiras.mockResolvedValue({ data: [career()], stats: null });
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list-item")).toHaveAttribute("data-accessories", "11 legislatures"));
  });

  it("makes each row findable by party and legislature", async () => {
    mocks.listCarreiras.mockResolvedValue({ data: [career()], stats: null });
    render(<Command />);
    const item = await waitFor(() => screen.getByTestId("list-item"));
    const keywords = item.getAttribute("data-keywords");
    expect(keywords).toContain("PCP");
    expect(keywords).toContain("VI");
  });

  it("opens the detail pane only when there are rows to show in it", async () => {
    mocks.listCarreiras.mockResolvedValue({ data: [], stats: null });
    const { unmount } = render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "false"));
    unmount();

    mocks.listCarreiras.mockResolvedValue({ data: [career()], stats: null });
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-showing-detail", "true"));
  });

  it("shows no population comparison even when the API sends stats (D113)", async () => {
    mocks.listCarreiras.mockResolvedValue({
      data: [career()],
      stats: { totalDeputies: 3012, singleTerm: 1204, avgLegs: 1.83 },
    });
    render(<Command />);
    const detail = await waitFor(() => screen.getByTestId("item-detail"));
    expect(detail.getAttribute("data-markdown")).not.toContain("For comparison");
  });

  it("still renders rows when the API sent no aggregate stats", async () => {
    mocks.listCarreiras.mockResolvedValue({ data: [career()], stats: null });
    render(<Command />);
    const detail = await waitFor(() => screen.getByTestId("item-detail"));
    expect(detail.getAttribute("data-markdown")).not.toContain("For comparison");
  });

  it("says so when there is no ranking", async () => {
    mocks.listCarreiras.mockResolvedValue({ data: [], stats: null });
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No ranking available"));
  });

  it("reports a failure as a failure", async () => {
    mocks.listCarreiras.mockRejectedValue(new OpenArError("boom", 500));
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Could not reach openAR"),
    );
  });
});
