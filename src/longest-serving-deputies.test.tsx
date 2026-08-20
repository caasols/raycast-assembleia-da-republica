/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { OpenArError } from "./lib/errors";
import type { Carreira } from "./lib/types";

const mocks = vi.hoisted(() => ({ getPageSize: vi.fn(), listCarreiras: vi.fn() }));
vi.mock("./lib/openar-client", () => ({ listCarreiras: mocks.listCarreiras }));
vi.mock("./lib/preferences", () => ({ getPageSize: mocks.getPageSize }));

import Command from "./longest-serving-deputies";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPageSize.mockReturnValue(100);
});

function career(overrides: Partial<Carreira> = {}): Carreira {
  return {
    id: 7,
    nomeParlamentar: "António Filipe",
    totalLegs: 11,
    firstLegStart: "1991-10-31",
    lastLegStart: "2024-03-26",
    lastParty: "PCP",
    legIds: ["VI", "VII"],
    ...overrides,
  };
}

describe("Longest-Serving Deputies", () => {
  it("has a default export that renders a List", () => {
    mocks.listCarreiras.mockResolvedValue({ data: [], stats: null });
    render(<Command />);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("asks for as many ranked deputies as the user chose", async () => {
    mocks.getPageSize.mockReturnValue(25);
    mocks.listCarreiras.mockResolvedValue({ data: [], stats: null });
    render(<Command />);
    await waitFor(() => expect(mocks.listCarreiras).toHaveBeenCalledWith(25));
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

  it("puts the population comparison in the detail pane", async () => {
    mocks.listCarreiras.mockResolvedValue({
      data: [career()],
      stats: { totalDeputies: 3012, singleTerm: 1204, avgLegs: 1.83 },
    });
    render(<Command />);
    const detail = await waitFor(() => screen.getByTestId("item-detail"));
    expect(detail.getAttribute("data-markdown")).toContain("Across all 3,012 deputies");
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
